//! 翻译领域规则：输入校验、提示词与输出解析。
//!
//! 本模块保持纯函数：不发请求、不读文件，便于单元测试。

use serde_json::{json, Value};

use super::{error::DomainError, settings::ApiMode};

/// 单次翻译输入的最大字符数。
pub const MAX_INPUT_CHARS: usize = 10_000;

/// Responses 接口的路径段。
pub const RESPONSES_PATH: &str = "responses";

/// 聊天补全接口的路径段。
pub const CHAT_COMPLETIONS_PATH: &str = "chat/completions";

/// 翻译输出实体。
///
/// `Deserialize` 契约的是模型返回的 JSON 结构（camelCase），
/// 属于翻译协议而非 IPC DTO。
#[derive(Debug, Clone, PartialEq, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationOutput {
    /// 识别出的源语言。
    pub source_language: String,
    /// 目标语言。
    pub target_language: String,
    /// 译文。
    pub result: String,
}

/// 一次翻译请求传给翻译端口所需的全部参数。
#[derive(Debug, Clone, PartialEq)]
pub struct TranslationQuery {
    /// 已校验的原文。
    pub text: String,
    /// 目标语言。
    pub target_language: String,
    /// OpenAI 兼容接口地址（来自本地设置，不来自前端请求）。
    pub api_base_url: String,
    /// 接口类型。
    pub api_mode: ApiMode,
    /// 模型名。
    pub model: String,
    /// 解密后的 API 密钥，仅经 Bearer 头发送。
    pub api_key: String,
}

/// 校验并规整输入文本：去首尾空白，拒绝空文本与超长文本。
pub fn validate_input(raw: &str) -> Result<&str, DomainError> {
    let text = raw.trim();
    if text.is_empty() {
        return Err(DomainError::EmptyInput);
    }
    if text.chars().count() > MAX_INPUT_CHARS {
        return Err(DomainError::InputTooLong {
            max: MAX_INPUT_CHARS,
        });
    }
    Ok(text)
}

/// 由接口地址拼出具体端点；地址已含目标路径时原样返回。
pub fn endpoint_for(base_url: &str, path: &str) -> String {
    let base = base_url.trim().trim_end_matches('/');
    if base.ends_with(path) {
        base.to_string()
    } else {
        format!("{base}/{path}")
    }
}

/// 构建 Responses 接口请求体（JSON Schema 约束输出结构）。
pub fn build_responses_payload(query: &TranslationQuery) -> Value {
    json!({
        "model": query.model,
        "input": user_prompt(&query.text, &query.target_language),
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
    })
}

/// 构建聊天补全接口请求体。
pub fn build_chat_completions_payload(query: &TranslationQuery) -> Value {
    json!({
        "model": query.model,
        "messages": [
            { "role": "system", "content": system_prompt() },
            { "role": "user", "content": user_prompt(&query.text, &query.target_language) }
        ],
        "temperature": 0.2,
        "response_format": { "type": "json_object" }
    })
}

/// 从 Responses 接口响应中提取输出文本。
///
/// 兼容两种形态：顶层 `output_text` 字段，或 `output` 数组中
/// 各内容项的 `text` 拼接；均为空时返回 `None`。
pub fn extract_responses_output_text(payload: &Value) -> Option<String> {
    if let Some(text) = payload.get("output_text").and_then(Value::as_str) {
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }

    let text = payload
        .get("output")?
        .as_array()?
        .iter()
        .flat_map(|item| {
            item.get("content")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
        })
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

/// 从聊天补全接口响应中提取消息内容。
pub fn extract_chat_output_text(payload: &Value) -> Result<String, DomainError> {
    payload
        .pointer("/choices/0/message/content")
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| DomainError::ResponseParse("响应缺少 choices[0].message.content".into()))
}

/// 解析模型输出为翻译结果。
///
/// 模型按约定返回 JSON；当输出不是合法 JSON 时，将原始文本作为译文兜底，
/// 源语言记为 `Auto`（向后兼容旧版行为）。
pub fn parse_output_text(
    output_text: &str,
    fallback_target_language: &str,
) -> Result<TranslationOutput, DomainError> {
    if let Ok(parsed) = serde_json::from_str::<TranslationOutput>(output_text) {
        return Ok(parsed);
    }

    let result = output_text.trim();
    if result.is_empty() {
        return Err(DomainError::ResponseParse("模型输出为空".into()));
    }

    Ok(TranslationOutput {
        source_language: "Auto".to_string(),
        target_language: fallback_target_language.to_string(),
        result: result.to_string(),
    })
}

/// 系统提示词：约束模型只输出翻译 JSON。
fn system_prompt() -> &'static str {
    "You are a fast desktop translation engine. Preserve meaning, tone, formatting, punctuation, and line breaks. Do not add explanations. Return only JSON."
}

/// 用户提示词：携带待翻译文本与目标语言。
fn user_prompt(text: &str, target_language: &str) -> String {
    format!(
        "Translate the following text to {target_language}. Auto-detect the source language. Return only JSON with keys sourceLanguage, targetLanguage, and result.\n\nText:\n{text}"
    )
}

/// Responses 接口输出结构的 JSON Schema。
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

#[cfg(test)]
#[path = "tests.rs"]
mod tests;
