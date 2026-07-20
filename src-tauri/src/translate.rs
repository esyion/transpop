use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const OPENAI_RESPONSES_URL: &str = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL: &str = "gpt-5.4";

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
    pub provider: String,
    pub api_key: Option<String>,
}

#[tauri::command]
pub async fn translate(request: TranslateRequest) -> Result<TranslationResult, String> {
    let text = request.text.trim();
    if text.is_empty() {
        return Err("text is empty".to_string());
    }

    match request.provider.as_str() {
        "OpenAI" => translate_with_openai(text, &request.target_language, request.api_key).await,
        "DeepL" | "Google" => Err(format!(
            "{} provider is reserved but not implemented yet",
            request.provider
        )),
        other => Err(format!("unsupported provider: {other}")),
    }
}

async fn translate_with_openai(
    text: &str,
    target_language: &str,
    api_key: Option<String>,
) -> Result<TranslationResult, String> {
    let api_key = api_key
        .map(|key| key.trim().to_string())
        .filter(|key| !key.is_empty())
        .ok_or_else(|| "OpenAI API key is required".to_string())?;

    let model = std::env::var("OPENAI_TRANSLATE_MODEL")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_OPENAI_MODEL.to_string());

    let client = reqwest::Client::new();
    let body = json!({
        "model": model,
        "input": format!(
            "Translate the following text to {target_language}. Auto-detect the source language. Return only JSON matching the schema.\n\nText:\n{text}"
        ),
        "instructions": "You are a fast desktop translation engine. Preserve meaning, tone, formatting, punctuation, and line breaks. Do not add explanations.",
        "store": false,
        "max_output_tokens": 1200,
        "text": {
            "format": {
                "type": "json_schema",
                "name": "translation_result",
                "description": "Detected source language, configured target language, and translated text.",
                "strict": true,
                "schema": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "sourceLanguage": { "type": "string" },
                        "targetLanguage": { "type": "string" },
                        "result": { "type": "string" }
                    },
                    "required": ["sourceLanguage", "targetLanguage", "result"]
                }
            }
        }
    });

    let response = client
        .post(OPENAI_RESPONSES_URL)
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await
        .map_err(|err| format!("OpenAI request failed: {err}"))?;

    let status = response.status();
    let payload: Value = response
        .json()
        .await
        .map_err(|err| format!("OpenAI response was not JSON: {err}"))?;

    if !status.is_success() {
        let message = payload
            .pointer("/error/message")
            .and_then(Value::as_str)
            .unwrap_or("OpenAI API returned an error");
        return Err(format!("OpenAI API error ({status}): {message}"));
    }

    let output_text = extract_output_text(&payload)
        .ok_or_else(|| "OpenAI response did not include output text".to_string())?;

    serde_json::from_str::<TranslationResult>(&output_text)
        .map_err(|err| format!("failed to parse translation result: {err}"))
}

fn extract_output_text(payload: &Value) -> Option<String> {
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

    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

