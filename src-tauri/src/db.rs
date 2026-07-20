use std::{fs, path::PathBuf, time::{SystemTime, UNIX_EPOCH}};

use aes_gcm::{
    aead::{rand_core::RngCore, Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use keyring::{Entry, Error as KeyringError};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

const DB_FILE_NAME: &str = "transpop.sqlite3";
const KEYRING_SERVICE: &str = "TransPop";
const KEYRING_USER: &str = "sqlite-api-key-encryption";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub provider: String,
    pub target_language: String,
    pub smart_target_language: bool,
    pub shortcut: String,
    pub shortcut_enabled: bool,
    pub theme: String,
    pub font_scale: f64,
    pub startup: bool,
    pub auto_copy: bool,
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default)]
    pub api_key_configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryItem {
    pub id: String,
    pub input: String,
    pub output: String,
    pub source_language: String,
    pub target_language: String,
    pub created_at: i64,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            provider: "OpenAI".to_string(),
            target_language: "Chinese".to_string(),
            smart_target_language: true,
            shortcut: "Alt + Space".to_string(),
            shortcut_enabled: true,
            theme: "system".to_string(),
            font_scale: 1.0,
            startup: false,
            auto_copy: true,
            api_key: None,
            api_key_configured: false,
        }
    }
}

pub fn init<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let conn = connection(app)?;
    migrate(&conn)?;
    ensure_settings_row(&conn)?;
    Ok(())
}

#[tauri::command]
pub fn get_app_settings<R: Runtime>(app: AppHandle<R>) -> Result<AppSettings, String> {
    let conn = connection(&app)?;
    migrate(&conn)?;
    ensure_settings_row(&conn)?;
    load_settings_from_conn(&conn)
}

#[tauri::command]
pub fn save_app_settings<R: Runtime>(app: AppHandle<R>, settings: AppSettings) -> Result<AppSettings, String> {
    let conn = connection(&app)?;
    migrate(&conn)?;
    ensure_settings_row(&conn)?;

    let mut existing_secret = conn
        .query_row(
            "SELECT api_key_ciphertext, api_key_nonce FROM app_settings WHERE id = 1",
            [],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .map_err(|err| err.to_string())?;

    if let Some(api_key) = settings.api_key.as_deref().map(str::trim).filter(|key| !key.is_empty()) {
        existing_secret = encrypt_secret(api_key)?.into();
    }

    conn.execute(
        "UPDATE app_settings
         SET provider = ?1,
             target_language = ?2,
             smart_target_language = ?3,
             shortcut = ?4,
             shortcut_enabled = ?5,
             theme = ?6,
             font_scale = ?7,
             startup = ?8,
             auto_copy = ?9,
             api_key_ciphertext = ?10,
             api_key_nonce = ?11,
             updated_at = ?12
         WHERE id = 1",
        params![
            "OpenAI",
            settings.target_language,
            bool_to_i64(settings.smart_target_language),
            settings.shortcut,
            bool_to_i64(settings.shortcut_enabled),
            settings.theme,
            settings.font_scale,
            bool_to_i64(settings.startup),
            bool_to_i64(settings.auto_copy),
            existing_secret.0,
            existing_secret.1,
            now_ts(),
        ],
    )
    .map_err(|err| err.to_string())?;

    load_settings_from_conn(&conn)
}

#[tauri::command]
pub fn list_recent_history<R: Runtime>(app: AppHandle<R>, limit: Option<i64>) -> Result<Vec<HistoryItem>, String> {
    let conn = connection(&app)?;
    migrate(&conn)?;
    list_recent_history_from_conn(&conn, limit.unwrap_or(3))
}

pub fn get_decrypted_api_key<R: Runtime>(app: &AppHandle<R>) -> Result<Option<String>, String> {
    let conn = connection(app)?;
    migrate(&conn)?;
    let encrypted = conn
        .query_row(
            "SELECT api_key_ciphertext, api_key_nonce FROM app_settings WHERE id = 1",
            [],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .optional()
        .map_err(|err| err.to_string())?;

    match encrypted {
        Some((Some(ciphertext), Some(nonce))) => decrypt_secret(&ciphertext, &nonce).map(Some),
        _ => Ok(None),
    }
}

pub fn get_shortcut_settings<R: Runtime>(app: &AppHandle<R>) -> Result<(String, bool), String> {
    let conn = connection(app)?;
    migrate(&conn)?;
    ensure_settings_row(&conn)?;
    conn.query_row(
        "SELECT shortcut, shortcut_enabled FROM app_settings WHERE id = 1",
        [],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)? != 0)),
    )
    .map_err(|err| err.to_string())
}

pub fn insert_history<R: Runtime>(app: &AppHandle<R>, item: &HistoryItem) -> Result<(), String> {
    let conn = connection(app)?;
    migrate(&conn)?;
    conn.execute(
        "INSERT INTO translation_history (id, input, output, source_language, target_language, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![item.id, item.input, item.output, item.source_language, item.target_language, item.created_at],
    )
    .map_err(|err| err.to_string())?;

    conn.execute(
        "DELETE FROM translation_history
         WHERE id NOT IN (SELECT id FROM translation_history ORDER BY created_at DESC LIMIT 100)",
        [],
    )
    .map_err(|err| err.to_string())?;

    Ok(())
}

fn connection<R: Runtime>(app: &AppHandle<R>) -> Result<Connection, String> {
    let path = db_path(app)?;
    Connection::open(path).map_err(|err| err.to_string())
}

fn db_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|err| err.to_string())?;
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    Ok(dir.join(DB_FILE_NAME))
}

fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         CREATE TABLE IF NOT EXISTS app_settings (
           id INTEGER PRIMARY KEY CHECK (id = 1),
           provider TEXT NOT NULL DEFAULT 'OpenAI',
           target_language TEXT NOT NULL DEFAULT 'Chinese',
           smart_target_language INTEGER NOT NULL DEFAULT 1,
           shortcut TEXT NOT NULL DEFAULT 'Alt + Space',
           shortcut_enabled INTEGER NOT NULL DEFAULT 1,
           theme TEXT NOT NULL DEFAULT 'system',
           font_scale REAL NOT NULL DEFAULT 1.0,
           startup INTEGER NOT NULL DEFAULT 0,
           auto_copy INTEGER NOT NULL DEFAULT 1,
           api_key_ciphertext TEXT,
           api_key_nonce TEXT,
           created_at INTEGER NOT NULL,
           updated_at INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS translation_history (
           id TEXT PRIMARY KEY,
           input TEXT NOT NULL,
           output TEXT NOT NULL,
           source_language TEXT NOT NULL,
           target_language TEXT NOT NULL,
           created_at INTEGER NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_translation_history_created_at ON translation_history(created_at DESC);",
    )
    .map_err(|err| err.to_string())
}

fn ensure_settings_row(conn: &Connection) -> Result<(), String> {
    let now = now_ts();
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (id, created_at, updated_at) VALUES (1, ?1, ?1)",
        params![now],
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

fn load_settings_from_conn(conn: &Connection) -> Result<AppSettings, String> {
    conn.query_row(
        "SELECT provider, target_language, smart_target_language, shortcut, shortcut_enabled, theme,
                font_scale, startup, auto_copy, api_key_ciphertext
         FROM app_settings WHERE id = 1",
        [],
        |row| {
            Ok(AppSettings {
                provider: row.get(0)?,
                target_language: row.get(1)?,
                smart_target_language: row.get::<_, i64>(2)? != 0,
                shortcut: row.get(3)?,
                shortcut_enabled: row.get::<_, i64>(4)? != 0,
                theme: row.get(5)?,
                font_scale: row.get(6)?,
                startup: row.get::<_, i64>(7)? != 0,
                auto_copy: row.get::<_, i64>(8)? != 0,
                api_key: None,
                api_key_configured: row.get::<_, Option<String>>(9)?.is_some(),
            })
        },
    )
    .map_err(|err| err.to_string())
}

fn list_recent_history_from_conn(conn: &Connection, limit: i64) -> Result<Vec<HistoryItem>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, input, output, source_language, target_language, created_at
             FROM translation_history ORDER BY created_at DESC LIMIT ?1",
        )
        .map_err(|err| err.to_string())?;

    let rows = stmt
        .query_map(params![limit.clamp(1, 100)], |row| {
            Ok(HistoryItem {
                id: row.get(0)?,
                input: row.get(1)?,
                output: row.get(2)?,
                source_language: row.get(3)?,
                target_language: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|err| err.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|err| err.to_string())
}

fn encrypt_secret(secret: &str) -> Result<(Option<String>, Option<String>), String> {
    let key = encryption_key()?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, secret.as_bytes())
        .map_err(|_| "failed to encrypt API key".to_string())?;

    Ok((Some(BASE64.encode(ciphertext)), Some(BASE64.encode(nonce.as_slice()))))
}

fn decrypt_secret(ciphertext: &str, nonce: &str) -> Result<String, String> {
    let key = encryption_key()?;
    let ciphertext = BASE64.decode(ciphertext).map_err(|err| err.to_string())?;
    let nonce = BASE64.decode(nonce).map_err(|err| err.to_string())?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));
    let plaintext = cipher
        .decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref())
        .map_err(|_| "failed to decrypt API key".to_string())?;
    String::from_utf8(plaintext).map_err(|err| err.to_string())
}

fn encryption_key() -> Result<Vec<u8>, String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|err| err.to_string())?;
    match entry.get_password() {
        Ok(encoded) => BASE64.decode(encoded).map_err(|err| err.to_string()),
        Err(KeyringError::NoEntry) => {
            let mut key = [0_u8; 32];
            OsRng.fill_bytes(&mut key);
            let encoded = BASE64.encode(key);
            entry.set_password(&encoded).map_err(|err| err.to_string())?;
            Ok(key.to_vec())
        }
        Err(err) => Err(err.to_string()),
    }
}

fn bool_to_i64(value: bool) -> i64 {
    if value { 1 } else { 0 }
}

pub fn now_ts() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

