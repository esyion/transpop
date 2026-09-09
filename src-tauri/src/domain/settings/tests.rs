use super::*;

#[test]
fn api_mode_round_trips_through_storage_strings() {
    assert_eq!(ApiMode::Responses.as_str(), "responses");
    assert_eq!(
        ApiMode::from_str_raw("chat_completions"),
        Some(ApiMode::ChatCompletions)
    );
    assert_eq!(ApiMode::from_str_raw("bogus"), None);
}

#[test]
fn api_mode_normalized_falls_back_to_responses() {
    assert_eq!(
        ApiMode::normalized("chat_completions"),
        ApiMode::ChatCompletions
    );
    assert_eq!(ApiMode::normalized("nonsense"), ApiMode::Responses);
}

#[test]
fn normalized_accepts_defaults() {
    let settings = TranslationSettings::default().normalized().unwrap();
    assert_eq!(settings.api_base_url, DEFAULT_API_BASE_URL);
    assert_eq!(settings.model, DEFAULT_MODEL);
}

#[test]
fn normalized_trims_and_strips_trailing_slash() {
    let settings = TranslationSettings {
        api_base_url: "  https://api.example.com/v1/  ".to_string(),
        model: "  qwen-plus ".to_string(),
        ..Default::default()
    }
    .normalized()
    .unwrap();
    assert_eq!(settings.api_base_url, "https://api.example.com/v1");
    assert_eq!(settings.model, "qwen-plus");
}

#[test]
fn normalized_rejects_non_http_scheme() {
    let settings = TranslationSettings {
        api_base_url: "file:///etc/passwd".to_string(),
        ..Default::default()
    };
    assert!(settings.normalized().is_err());
}

#[test]
fn normalized_rejects_scheme_without_host() {
    let settings = TranslationSettings {
        api_base_url: "https://".to_string(),
        ..Default::default()
    };
    assert!(settings.normalized().is_err());
}

#[test]
fn normalized_rejects_invalid_theme() {
    assert!(ThemeMode::from_str_raw("solarized").is_none());
}

#[test]
fn normalized_rejects_font_scale_out_of_range() {
    let settings = TranslationSettings {
        font_scale: 5.0,
        ..Default::default()
    };
    assert!(settings.normalized().is_err());
}

#[test]
fn normalized_rejects_empty_target_language() {
    let settings = TranslationSettings {
        target_language: "   ".to_string(),
        ..Default::default()
    };
    assert!(settings.normalized().is_err());
}

#[test]
fn normalized_rejects_empty_shortcut_when_enabled() {
    let settings = TranslationSettings {
        shortcut: "  ".to_string(),
        ..Default::default()
    };
    assert!(settings.clone().normalized().is_err());

    let settings = TranslationSettings {
        shortcut: "  ".to_string(),
        shortcut_enabled: false,
        ..Default::default()
    };
    assert!(settings.normalized().is_ok());
}

#[test]
fn sanitize_base_url_falls_back_to_default_on_garbage() {
    assert_eq!(
        sanitize_base_url("file:///etc/passwd"),
        DEFAULT_API_BASE_URL
    );
    assert_eq!(sanitize_base_url("https://"), DEFAULT_API_BASE_URL);
    assert_eq!(sanitize_base_url("   "), DEFAULT_API_BASE_URL);
    assert_eq!(
        sanitize_base_url("  https://api.example.com/v1/  "),
        "https://api.example.com/v1"
    );
}
