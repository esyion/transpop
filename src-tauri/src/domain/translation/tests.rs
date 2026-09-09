use super::*;
use crate::domain::settings::{ApiMode, DEFAULT_MODEL};

fn query(api_base_url: &str, api_mode: ApiMode) -> TranslationQuery {
    TranslationQuery {
        text: "hello".to_string(),
        target_language: "Chinese".to_string(),
        api_base_url: api_base_url.to_string(),
        api_mode,
        model: DEFAULT_MODEL.to_string(),
        api_key: "sk-test".to_string(),
    }
}

#[test]
fn validate_input_rejects_empty_and_overlong() {
    assert!(matches!(
        validate_input("   "),
        Err(DomainError::EmptyInput)
    ));
    let long = "字".repeat(MAX_INPUT_CHARS + 1);
    assert!(matches!(
        validate_input(&long),
        Err(DomainError::InputTooLong { .. })
    ));
    assert_eq!(validate_input("  hi  ").unwrap(), "hi");
    let boundary = "字".repeat(MAX_INPUT_CHARS);
    assert!(validate_input(&boundary).is_ok());
}

#[test]
fn endpoint_for_avoids_duplicated_path() {
    assert_eq!(
        endpoint_for("https://api.example.com/v1", RESPONSES_PATH),
        "https://api.example.com/v1/responses"
    );
    assert_eq!(
        endpoint_for("https://api.example.com/v1/responses", RESPONSES_PATH),
        "https://api.example.com/v1/responses"
    );
}

#[test]
fn payloads_never_contain_api_key() {
    for mode in [ApiMode::Responses, ApiMode::ChatCompletions] {
        let payload = match mode {
            ApiMode::Responses => build_responses_payload(&query("https://x/v1", mode)),
            ApiMode::ChatCompletions => {
                build_chat_completions_payload(&query("https://x/v1", mode))
            }
        };
        assert!(!payload.to_string().contains("sk-test"));
    }
}

#[test]
fn extract_responses_output_text_supports_both_shapes() {
    let flat = json!({ "output_text": "  result  " });
    assert_eq!(
        extract_responses_output_text(&flat),
        Some("result".to_string())
    );

    let nested = json!({
        "output": [
            { "content": [ { "text": "a" }, { "text": "b" } ] }
        ]
    });
    assert_eq!(
        extract_responses_output_text(&nested),
        Some("ab".to_string())
    );

    assert_eq!(extract_responses_output_text(&json!({})), None);
}

#[test]
fn parse_output_text_falls_back_to_raw_text() {
    let json_output = r#"{"sourceLanguage":"English","targetLanguage":"Chinese","result":"你好"}"#;
    let parsed = parse_output_text(json_output, "Chinese").unwrap();
    assert_eq!(parsed.result, "你好");
    assert_eq!(parsed.source_language, "English");

    let raw = parse_output_text("just text", "Chinese").unwrap();
    assert_eq!(raw.result, "just text");
    assert_eq!(raw.source_language, "Auto");
    assert!(parse_output_text("   ", "Chinese").is_err());
}

#[test]
fn extract_chat_output_text_reports_missing_content() {
    assert!(extract_chat_output_text(&json!({})).is_err());
    assert_eq!(
        extract_chat_output_text(&json!({"choices":[{"message":{"content":"ok"}}]})).unwrap(),
        "ok"
    );
}
