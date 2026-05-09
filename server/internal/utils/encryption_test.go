package utils

import (
	"testing"

	"go-server/internal/config"
)

func TestCredentialEncryptionUsesCredentialSecret(t *testing.T) {
	restoreConfig := config.Envs
	t.Cleanup(func() {
		config.Envs = restoreConfig
	})

	config.Envs = config.Config{
		APISecret:        "payload-secret-with-enough-length",
		CredentialSecret: "credential-secret-with-enough-length",
	}

	encrypted, err := EncryptCredential("stored-password")
	if err != nil {
		t.Fatalf("EncryptCredential() error = %v", err)
	}

	decrypted, err := DecryptCredential(encrypted)
	if err != nil {
		t.Fatalf("DecryptCredential() error = %v", err)
	}
	if decrypted != "stored-password" {
		t.Fatalf("DecryptCredential() = %q, want %q", decrypted, "stored-password")
	}

	wrong, err := DecryptPayload(encrypted)
	if err == nil && wrong == "stored-password" {
		t.Fatal("DecryptPayload() decrypted credential ciphertext with payload secret")
	}
}

func TestPayloadDecryptUsesAPISecret(t *testing.T) {
	restoreConfig := config.Envs
	t.Cleanup(func() {
		config.Envs = restoreConfig
	})

	config.Envs = config.Config{
		APISecret:        "payload-secret-with-enough-length",
		CredentialSecret: "credential-secret-with-enough-length",
	}

	encrypted, err := encryptWithSecret(`{"host":"example.test"}`, config.Envs.APISecret)
	if err != nil {
		t.Fatalf("encryptWithSecret() error = %v", err)
	}

	decrypted, err := DecryptPayload(encrypted)
	if err != nil {
		t.Fatalf("DecryptPayload() error = %v", err)
	}
	if decrypted != `{"host":"example.test"}` {
		t.Fatalf("DecryptPayload() = %q, want payload JSON", decrypted)
	}
}
