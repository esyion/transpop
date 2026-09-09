//! API 密钥加密适配器：AES-256-GCM 加密 + 系统钥匙串托管主密钥。

use aes_gcm::{
    aead::{rand_core::RngCore, Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use keyring::{Entry, Error as KeyringError};

use crate::application::ports::SecretStore;
use crate::domain::error::DomainError;
use crate::domain::settings::StoredSecret;

/// 钥匙串服务名。
const KEYRING_SERVICE: &str = "TransPop";
/// 钥匙串条目名。
const KEYRING_USER: &str = "sqlite-api-key-encryption";

/// 基于「钥匙串主密钥 + AES-256-GCM」的密钥保险箱。
///
/// 密文与 nonce 存本地 SQLite，主密钥存操作系统钥匙串；
/// 卸载应用并清理钥匙串后数据不可恢复。
pub struct KeyringSecretStore;

impl KeyringSecretStore {
    /// 构造保险箱（无状态）。
    pub fn new() -> Self {
        Self
    }

    /// 读取 32 字节主密钥；不存在时生成新密钥并写入钥匙串。
    fn master_key() -> Result<[u8; 32], DomainError> {
        let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
            .map_err(|err| DomainError::Storage(format!("无法访问系统钥匙串：{err}")))?;
        match entry.get_password() {
            Ok(encoded) => {
                let key = BASE64
                    .decode(encoded)
                    .map_err(|err| DomainError::Storage(format!("主密钥不是合法 Base64：{err}")))?;
                let key: [u8; 32] = key
                    .try_into()
                    .map_err(|_| DomainError::Storage("主密钥长度不是 32 字节".to_string()))?;
                Ok(key)
            }
            Err(KeyringError::NoEntry) => {
                let mut key = [0_u8; 32];
                OsRng.fill_bytes(&mut key);
                entry
                    .set_password(&BASE64.encode(key))
                    .map_err(|err| DomainError::Storage(format!("无法写入系统钥匙串：{err}")))?;
                Ok(key)
            }
            Err(err) => Err(DomainError::Storage(format!("读取系统钥匙串失败：{err}"))),
        }
    }
}

impl Default for KeyringSecretStore {
    fn default() -> Self {
        Self::new()
    }
}

impl SecretStore for KeyringSecretStore {
    fn encrypt(&self, plaintext: &str) -> Result<StoredSecret, DomainError> {
        let key = Self::master_key()?;
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));
        let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
        let ciphertext = cipher
            .encrypt(&nonce, plaintext.as_bytes())
            .map_err(|_| DomainError::Storage("API 密钥加密失败".to_string()))?;

        Ok(StoredSecret {
            ciphertext: Some(BASE64.encode(ciphertext)),
            nonce: Some(BASE64.encode(nonce.as_slice())),
        })
    }

    fn decrypt(&self, secret: &StoredSecret) -> Result<String, DomainError> {
        let (Some(ciphertext), Some(nonce)) = (&secret.ciphertext, &secret.nonce) else {
            return Err(DomainError::Storage("尚未存储 API 密钥".to_string()));
        };

        let key = Self::master_key()?;
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));
        let ciphertext = BASE64
            .decode(ciphertext)
            .map_err(|err| DomainError::Storage(format!("密文不是合法 Base64：{err}")))?;
        let nonce = BASE64
            .decode(nonce)
            .map_err(|err| DomainError::Storage(format!("nonce 不是合法 Base64：{err}")))?;
        let plaintext = cipher
            .decrypt(Nonce::from_slice(&nonce), ciphertext.as_ref())
            .map_err(|_| DomainError::Storage("API 密钥解密失败".to_string()))?;
        String::from_utf8(plaintext)
            .map_err(|err| DomainError::Storage(format!("API 密钥不是合法 UTF-8：{err}")))
    }
}
