package connection

import (
	"errors"
	"strings"
)

const (
	TypeSSH = "ssh"
	TypeRDP = "rdp"
	minPort = 1
	maxPort = 65535
)

type Fields struct {
	Name     string
	Host     string
	Port     int
	Username string
	Type     string
}

func NormalizeSaved(name, host string, port int, username, connType string) (Fields, error) {
	return normalize(name, host, port, username, connType, true, false)
}

func NormalizeSession(host string, port int, username, protocol string) (Fields, error) {
	return normalize("", host, port, username, protocol, false, true)
}

func normalize(name, host string, port int, username, connType string, requireName bool, inferTypeFromPort bool) (Fields, error) {
	fields := Fields{
		Name:     strings.TrimSpace(name),
		Host:     strings.TrimSpace(host),
		Port:     port,
		Username: strings.TrimSpace(username),
		Type:     strings.ToLower(strings.TrimSpace(connType)),
	}

	if requireName && fields.Name == "" {
		return Fields{}, errors.New("name is required")
	}
	if fields.Host == "" {
		return Fields{}, errors.New("host is required")
	}
	if fields.Username == "" {
		return Fields{}, errors.New("username is required")
	}

	switch fields.Type {
	case "":
		fields.Type = TypeSSH
		if inferTypeFromPort && fields.Port == 3389 {
			fields.Type = TypeRDP
		}
	case TypeSSH, TypeRDP:
	default:
		return Fields{}, errors.New("type must be ssh or rdp")
	}

	if fields.Port == 0 {
		if fields.Type == TypeRDP {
			fields.Port = 3389
		} else {
			fields.Port = 22
		}
	}

	if fields.Port < minPort || fields.Port > maxPort {
		return Fields{}, errors.New("port must be between 1 and 65535")
	}

	return fields, nil
}
