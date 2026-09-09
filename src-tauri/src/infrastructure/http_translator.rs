//! OpenAI 兼容 HTTP 翻译客户端。
//!
//! 安全面约束：API 密钥只经 Bearer 头发往设置中保存的接口地址；
//! 请求体由领域层纯函数构建，永不包含密钥。

use std::time::Duration;

use async_trait::async_trait;
use serde_json::Value;

use crate::application::ports::TranslatorClient;
use crate::domain::error::DomainError;
use crate::domain::settings::ApiMode;
use crate::domain::translation::{
    build_chat_completions_payload, build_responses_payload, endpoint_for,
    extract_chat_output_text, extract_responses_output_text, parse_output_text, TranslationOutput,
    TranslationQuery, CHAT_COMPLETIONS_PATH, RESPONSES_PATH,
};

/// TCP 连接超时。
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
/// 单次请求总超时，避免网络挂起长时间阻塞 UI。
const REQUEST_TIMEOUT: Duration = Duration::from_secs(60);

/// OpenAI 兼容（Responses / Chat Completions）翻译客户端。
pub struct OpenAiCompatibleTranslator {
    client: reqwest::Client,
}

impl OpenAiCompatibleTranslator {
    /// 创建客户端；仅 TLS 后端初始化失败时返回错误。
    pub fn new() -> Result<Self, DomainError> {
        let client = reqwest::Client::builder()
            .connect_timeout(CONNECT_TIMEOUT)
            .timeout(REQUEST_TIMEOUT)
            .build()
            .map_err(|err| DomainError::Configuration(format!("HTTP 客户端初始化失败：{err}")))?;
        Ok(Self { client })
    }

    /// 发送 JSON POST 并解析响应体；非 2xx 时映射为 [`DomainError::RequestFailed`]。
    async fn post_json(
        &self,
        url: &str,
        api_key: &str,
        body: &Value,
    ) -> Result<Value, DomainError> {
        let response = self
            .client
            .post(url)
            .bearer_auth(api_key)
            .json(body)
            .send()
            .await
            .map_err(|err| DomainError::RequestFailed(format!("请求未到达翻译服务：{err}")))?;

        let status = response.status();
        let payload: Value = response.json().await.map_err(|err| {
            DomainError::ResponseParse(format!("响应体不是合法 JSON（status {status}）：{err}"))
        })?;

        if !status.is_success() {
            let message = payload
                .pointer("/error/message")
                .and_then(Value::as_str)
                .unwrap_or("翻译服务返回了错误");
            return Err(DomainError::RequestFailed(format!(
                "翻译服务错误（status {status}）：{message}"
            )));
        }

        Ok(payload)
    }
}

#[async_trait]
impl TranslatorClient for OpenAiCompatibleTranslator {
    async fn translate(&self, query: TranslationQuery) -> Result<TranslationOutput, DomainError> {
        match query.api_mode {
            ApiMode::Responses => {
                let url = endpoint_for(&query.api_base_url, RESPONSES_PATH);
                let payload = self
                    .post_json(&url, &query.api_key, &build_responses_payload(&query))
                    .await?;
                let text = extract_responses_output_text(&payload)
                    .ok_or_else(|| DomainError::ResponseParse("响应未包含输出文本".to_string()))?;
                parse_output_text(&text, &query.target_language)
            }
            ApiMode::ChatCompletions => {
                let url = endpoint_for(&query.api_base_url, CHAT_COMPLETIONS_PATH);
                let payload = self
                    .post_json(
                        &url,
                        &query.api_key,
                        &build_chat_completions_payload(&query),
                    )
                    .await?;
                let text = extract_chat_output_text(&payload)?;
                parse_output_text(&text, &query.target_language)
            }
        }
    }
}
