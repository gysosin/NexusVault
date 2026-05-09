package websocket

import (
	"os"
	"path/filepath"
	"testing"

	"go-server/internal/config"
)

func TestSSHHostKeyCallbackRejectsMissingKnownHostsWhenStrict(t *testing.T) {
	restoreConfig := config.Envs
	t.Cleanup(func() {
		config.Envs = restoreConfig
	})

	config.Envs = config.Config{AllowInsecureSSHHostKey: false}

	if _, err := sshHostKeyCallback(); err == nil {
		t.Fatal("sshHostKeyCallback() error = nil, want error")
	}
}

func TestSSHHostKeyCallbackAllowsExplicitInsecureMode(t *testing.T) {
	restoreConfig := config.Envs
	t.Cleanup(func() {
		config.Envs = restoreConfig
	})

	config.Envs = config.Config{AllowInsecureSSHHostKey: true}

	callback, err := sshHostKeyCallback()
	if err != nil {
		t.Fatalf("sshHostKeyCallback() error = %v", err)
	}
	if callback == nil {
		t.Fatal("sshHostKeyCallback() callback = nil, want callback")
	}
}

func TestSSHHostKeyCallbackLoadsKnownHostsFile(t *testing.T) {
	restoreConfig := config.Envs
	t.Cleanup(func() {
		config.Envs = restoreConfig
	})

	knownHostsPath := filepath.Join(t.TempDir(), "known_hosts")
	if err := os.WriteFile(knownHostsPath, []byte{}, 0o600); err != nil {
		t.Fatalf("WriteFile(known_hosts) error = %v", err)
	}

	config.Envs = config.Config{SSHKnownHostsPath: knownHostsPath}

	callback, err := sshHostKeyCallback()
	if err != nil {
		t.Fatalf("sshHostKeyCallback() error = %v", err)
	}
	if callback == nil {
		t.Fatal("sshHostKeyCallback() callback = nil, want callback")
	}
}
