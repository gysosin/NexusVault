package rfb

// Connect is a minimal stub used to satisfy the client interface for VNC.
// The project only uses the RDP client path, so this no-op prevents build failures.
func (fb *RFB) Connect() error {
	return nil
}
