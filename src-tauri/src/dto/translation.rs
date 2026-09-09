//! 翻译 IPC DTO。

use serde::{Deserialize, Serialize};

use crate::domain::translation::TranslationOutput;

/// 翻译请求 DTO。
///
/// 安全面约束：只允许携带文本与目标语言；接口地址、接口类型、模型与
/// API 密钥一律由后端从本地设置读取，前端传入值被忽略。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslateRequestDto {
    /// 待翻译文本。
    pub text: String,
    /// 目标语言。
    pub target_language: String,
}

/// 翻译结果 DTO。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationResultDto {
    /// 识别出的源语言。
    pub source_language: String,
    /// 目标语言。
    pub target_language: String,
    /// 译文。
    pub result: String,
}

impl TranslationResultDto {
    /// 由领域实体转换。
    pub fn from_entity(output: TranslationOutput) -> Self {
        Self {
            source_language: output.source_language,
            target_language: output.target_language,
            result: output.result,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_deserializes_camel_case() {
        let raw = r#"{ "text": "hello", "targetLanguage": "Chinese" }"#;
        let request: TranslateRequestDto = serde_json::from_str(raw).unwrap();
        assert_eq!(request.text, "hello");
        assert_eq!(request.target_language, "Chinese");
    }

    #[test]
    fn result_serializes_camel_case() {
        let output = TranslationOutput {
            source_language: "English".to_string(),
            target_language: "Chinese".to_string(),
            result: "你好".to_string(),
        };
        let value = serde_json::to_value(TranslationResultDto::from_entity(output)).unwrap();
        assert_eq!(value["sourceLanguage"], "English");
        assert_eq!(value["targetLanguage"], "Chinese");
        assert_eq!(value["result"], "你好");
    }
}
