package utils

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/md5"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"go-server/internal/config"
)

func DecryptPayload(ciphertextB64 string) (string, error) {
	return decryptWithSecret(ciphertextB64, config.Envs.APISecret)
}

func EncryptCredential(plaintext string) (string, error) {
	return encryptWithSecret(plaintext, config.Envs.CredentialSecret)
}

func DecryptCredential(ciphertextB64 string) (string, error) {
	return decryptWithSecret(ciphertextB64, config.Envs.CredentialSecret)
}

func decryptWithSecret(ciphertextB64 string, secret string) (string, error) {
	if ciphertextB64 == "" {
		return "", nil
	}

	data, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return "", err
	}

	if len(data) < 16 || string(data[:8]) != "Salted__" {
		return "", errors.New("invalid ciphertext format")
	}

	salt := data[8:16]
	ciphertext := data[16:]

	key, iv := deriveKeyAndIV(secret, salt)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	if len(ciphertext)%aes.BlockSize != 0 {
		return "", errors.New("ciphertext is not a multiple of the block size")
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	mode.CryptBlocks(ciphertext, ciphertext)

	plaintext, err := pkcs7Unpad(ciphertext)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func encryptWithSecret(plaintext string, secret string) (string, error) {
	salt := make([]byte, 8)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	key, iv := deriveKeyAndIV(secret, salt)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	data := []byte(plaintext)
	data = pkcs7Pad(data, aes.BlockSize)

	ciphertext := make([]byte, len(data))
	mode := cipher.NewCBCEncrypter(block, iv)
	mode.CryptBlocks(ciphertext, data)

	// Format: "Salted__" + salt + ciphertext
	var buf bytes.Buffer
	buf.WriteString("Salted__")
	buf.Write(salt)
	buf.Write(ciphertext)

	return base64.StdEncoding.EncodeToString(buf.Bytes()), nil
}

func pkcs7Pad(data []byte, blockSize int) []byte {
	padding := blockSize - len(data)%blockSize
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(data, padtext...)
}

// deriveKeyAndIV derives 32-byte key and 16-byte IV from password and salt using EVP_BytesToKey with MD5
func deriveKeyAndIV(passphrase string, salt []byte) ([]byte, []byte) {
	// OpenSSL EVP_BytesToKey with MD5, 1 iteration
	// D_i = HASH^count(D_(i-1) || data || salt)
	// key + iv = D_1 || D_2 || ...

	const keyLen = 32
	const ivLen = 16
	targetLen := keyLen + ivLen

	var derived []byte
	var block []byte
	pass := []byte(passphrase)

	for len(derived) < targetLen {
		h := md5.New()
		if len(block) > 0 {
			h.Write(block)
		}
		h.Write(pass)
		h.Write(salt)
		block = h.Sum(nil)
		derived = append(derived, block...)
	}

	return derived[:keyLen], derived[keyLen : keyLen+ivLen]
}

func pkcs7Unpad(data []byte) ([]byte, error) {
	length := len(data)
	if length == 0 {
		return nil, errors.New("invalid padding size")
	}
	padding := int(data[length-1])
	if padding > length || padding == 0 {
		return nil, errors.New("invalid padding")
	}
	for i := 0; i < padding; i++ {
		if data[length-1-i] != byte(padding) {
			return nil, errors.New("invalid padding")
		}
	}
	return data[:length-padding], nil
}
