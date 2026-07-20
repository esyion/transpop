use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Runtime};

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationResult {
    pub source_language: String,
    pub target_language: String,
    pub result: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslateRequest {
    pub text: String,
    pub target_language: String,
    pub api_base_url: String,
    pub api_mode: String,
    pub model: String,
}

#[tauri::command]
pub async fn translate<R: Runtime>(
    app: AppHandle<R>,
    request: TranslateRequest,
) -> Result<TranslationResult, String> {
    let text = request.text.trim();
    if text.is_empty() {
        return Err("text is empty".to_string());
    }

    let api_key = db::get_decrypted_api_key(&app)?
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty())
        .ok_or_else(|| "API key is required".to_string())?;

    let result = match request.api_mode.as_str() {
        "chat_completions" => translate_with_chat_completions(&api_key, text, &request).await,
        "responses" => translate_with_responses(&api_key, text, &request).await,
        other => Err(format!("unsupported OpenAI-compatible interface: {other}")),
    }?;

    db::insert_history(&app, &db::HistoryItem {
        id: format!("{}-{}", db::now_ts(), text.len()),
        input: text.to_string(),
        output: result.result.clone(),
        source_language: result.source_language.clone(),
        target_language: result.target_language.clone(),
        created_at: db::now_ts(),
    })?;

    Ok(result)
}

async fn translate_with_responses(
    api_key: &str,
    text: &str,
    request: &TranslateRequest,
) -> Result<TranslationResult, String> {
    let url = endpoint(&request.api_base_url, "responses");
    let client = reqwest::Client::new();
    let body = json!({
        "model": normalize_model(&request.model),
        "input": user_prompt(text, &request.target_language),
        "instructions": system_prompt(),
        "store": false,
        "max_output_tokens": 1200,
        "text": {
            "format": {
                "type": "json_schema",
                "name": "translation_result",
                "description": "Detected source language, configured target language, and translated text.",
                "strict": true,
                "schema": translation_schema()
            }
        }
    });

    let payload = post_json(&client, &url, api_key, &body).await?;
    let output_text = extract_responses_output_text(&payload)
        .ok_or_else(|| "Responses API did not include output text".to_string())?;
    parse_translation_result(&output_text, &request.target_language)
}

async fn translate_with_chat_completions(
    api_key: &str,
    text: &str,
    request: &TranslateRequest,
) -> Result<TranslationResult, String> {
    let url = endpoint(&request.api_base_url, "chat/completions");
    let client = reqwest::Client::new();
    let body = json!({
        "model": normalize_model(&request.model),
        "messages": [
            { "role": "system", "content": system_prompt() },
            { "role": "user", "content": user_prompt(text, &request.target_language) }
        ],
        "temperature": 0.2,
        "response_format": { "type": "json_object" }
    });

    let payload = post_json(&client, &url, api_key, &body).await?;
    let output_text = payload
        .pointer("/choices/0/message/content")
        .and_then(Value::as_str)
        .ok_or_else(|| "Chat Completions API did not include message content".to_string())?;
    parse_translation_result(output_text, &request.target_language)
}

async fn post_json(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    body: &Value,
) -> Result<Value, String> {
    let response = client
        .post(url)
        .bearer_auth(api_key)
        .json(body)
        .send()
        .await
        .map_err(|err| format!("OpenAI-compatible request failed: {err}"))?;

    let status = response.status();
    let payload: Value = response
        .json()
        .await
        .map_err(|err| format!("OpenAI-compatible response was not JSON: {err}"))?;

    if !status.is_success() {
        let message = payload
            .pointer("/error/message")
            .and_then(Value::as_str)
            .unwrap_or("OpenAI-compatible API returned an error");
        return Err(format!("OpenAI-compatible API error ({status}): {message}"));
    }

    Ok(payload)
}

fn system_prompt() -> &'static str {
    "You are a fast desktop translation engine. Preserve meaning, tone, formatting, punctuation, and line breaks. Do not add explanations. Return only JSON."
}

fn user_prompt(text: &str, target_language: &str) -> String {
    format!(
        "Translate the following text to {target_language}. Auto-detect the source language. Return only JSON with keys sourceLanguage, targetLanguage, and result.\n\nText:\n{text}"
    )
}

fn translation_schema() -> Value {
    json!({
        "type": "object",
        "additionalProperties": false,
        "properties": {
            "sourceLanguage": { "type": "string" },
            "targetLanguage": { "type": "string" },
            "result": { "type": "string" }
        },
        "required": ["sourceLanguage", "targetLanguage", "result"]
    })
}

fn endpoint(base_url: &str, path: &str) -> String {
    let base = base_url.trim().trim_end_matches('/');
    if base.ends_with(path) {
        base.to_string()
    } else {
        format!("{base}/{path}")
    }
}

fn normalize_model(model: &str) -> String {
    let trimmed = model.trim();
    if trimmed.is_empty() {
        "gpt-5.4".to_string()
    } else {
        trimmed.to_string()
    }
}

fn extract_responses_output_text(payload: &Value) -> Option<String> {
    if let Some(text) = payload.get("output_text").and_then(Value::as_str) {
        if !text.trim().is_empty() {
            return Some(text.to_string());
        }
    }

    let text = payload
        .get("output")?
        .as_array()?
        .iter()
        .flat_map(|item| item.get("content").and_then(Value::as_array).into_iter().flatten())
        .filter_map(|content| content.get("text").and_then(Value::as_str))
        .collect::<Vec<_>>()
        .join("")
        .trim()
        .to_string();

    if text.is_empty() { None } else { Some(text) }
}

fn parse_translation_result(output_text: &str, target_language: &str) -> Result<TranslationResult, String> {
    serde_json::from_str::<TranslationResult>(output_text).or_else(|_| {
        Ok(TranslationResult {
            source_language: "Auto".to_string(),
            target_language: target_language.to_string(),
            result: output_text.trim().to_string(),
        })
    })
}
