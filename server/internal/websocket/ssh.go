package websocket

import (
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"go-server/internal/config"
	"go-server/internal/service"
	"go-server/internal/utils"
	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/knownhosts"
)

func StartSSHSession(session *service.Session) {
	hostKeyCallback, err := sshHostKeyCallback()
	if err != nil {
		utils.Log("SSH host key configuration error:", err)
		session.Broadcast(gin.H{"type": "error", "message": err.Error()})
		service.RemoveSession(session.ID)
		return
	}

	config := &ssh.ClientConfig{
		User: session.Username,
		Auth: []ssh.AuthMethod{
			ssh.Password(session.Password),
		},
		HostKeyCallback: hostKeyCallback,
		Timeout:         20 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", session.Host, session.Port)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		utils.Log("SSH Dial Error:", err)
		session.Broadcast(gin.H{"type": "error", "message": "SSH Connection Error: " + err.Error()})
		service.RemoveSession(session.ID)
		return
	}
	session.SSHClient = client

	session.Broadcast(gin.H{"type": "status", "message": "Connected to host."})

	sess, err := client.NewSession()
	if err != nil {
		utils.Log("SSH Session Error:", err)
		session.Broadcast(gin.H{"type": "error", "message": "Failed to create SSH session: " + err.Error()})
		client.Close()
		service.RemoveSession(session.ID)
		return
	}
	session.ShellSession = sess

	// Set up terminal modes
	modes := ssh.TerminalModes{
		ssh.ECHO:          1,     // enable echoing
		ssh.TTY_OP_ISPEED: 14400, // input speed = 14.4kbaud
		ssh.TTY_OP_OSPEED: 14400, // output speed = 14.4kbaud
	}

	// Request pseudo terminal
	if err := sess.RequestPty("xterm-256color", 24, 80, modes); err != nil {
		utils.Log("SSH PTY Error:", err)
		session.Broadcast(gin.H{"type": "error", "message": "Failed to request PTY: " + err.Error()})
		sess.Close()
		client.Close()
		service.RemoveSession(session.ID)
		return
	}

	// Pipes
	stdin, err := sess.StdinPipe()
	if err != nil {
		utils.Log("SSH Stdin Error:", err)
		return
	}

	stdout, err := sess.StdoutPipe()
	if err != nil {
		utils.Log("SSH Stdout Error:", err)
		return
	}

	stderr, err := sess.StderrPipe()
	if err != nil {
		utils.Log("SSH Stderr Error:", err)
		return
	}

	// Input helper
	session.Stdin = func(data string) error {
		_, err := stdin.Write([]byte(data))
		return err
	}

	// Start shell
	if err := sess.Shell(); err != nil {
		utils.Log("SSH Shell Error:", err)
		session.Broadcast(gin.H{"type": "error", "message": "Failed to start shell: " + err.Error()})
		sess.Close()
		client.Close()
		service.RemoveSession(session.ID)
		return
	}

	// Read loop
	go func() {
		defer func() {
			sess.Close()
			client.Close()
			service.RemoveSession(session.ID)
			session.Broadcast(gin.H{"type": "status", "message": "SSH Connection Closed"})
		}()

		// Combine stdout and stderr
		reader := io.MultiReader(stdout, stderr)
		buf := make([]byte, 4096)
		for {
			n, err := reader.Read(buf)
			if err != nil {
				if err != io.EOF {
					utils.Log("SSH Read Error:", err)
				}
				break
			}
			if n > 0 {
				data := string(buf[:n])
				session.AppendBuffer(data)
				session.Broadcast(gin.H{"type": "data", "data": data})
			}
		}
	}()
}

func sshHostKeyCallback() (ssh.HostKeyCallback, error) {
	if config.Envs.SSHKnownHostsPath != "" {
		return knownhosts.New(config.Envs.SSHKnownHostsPath)
	}

	if config.Envs.AllowInsecureSSHHostKey {
		return ssh.InsecureIgnoreHostKey(), nil
	}

	return nil, errors.New("SSH_KNOWN_HOSTS_PATH is required unless ALLOW_INSECURE_SSH_HOST_KEYS=true")
}
