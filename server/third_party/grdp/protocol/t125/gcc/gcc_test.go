package gcc

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"math/big"
	"testing"
	"time"

	"github.com/tomatome/grdp/core"
)

func TestX509CertificateChain_GetPublicKey(t *testing.T) {
	// 1. Generate Root CA
	rootKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("Failed to generate root key: %v", err)
	}

	rootTemplate := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization: []string{"Test Root CA"},
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(time.Hour * 24),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign,
		BasicConstraintsValid: true,
		IsCA:                  true,
	}

	rootDer, err := x509.CreateCertificate(rand.Reader, &rootTemplate, &rootTemplate, &rootKey.PublicKey, rootKey)
	if err != nil {
		t.Fatalf("Failed to create root certificate: %v", err)
	}

	// 2. Generate Leaf Certificate
	leafKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("Failed to generate leaf key: %v", err)
	}

	leafTemplate := x509.Certificate{
		SerialNumber: big.NewInt(2),
		Subject: pkix.Name{
			Organization: []string{"Test Leaf"},
		},
		NotBefore:   time.Now(),
		NotAfter:    time.Now().Add(time.Hour * 24),
		KeyUsage:    x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}

	leafDer, err := x509.CreateCertificate(rand.Reader, &leafTemplate, &rootTemplate, &leafKey.PublicKey, rootKey)
	if err != nil {
		t.Fatalf("Failed to create leaf certificate: %v", err)
	}

	// 3. Create X509CertificateChain with [Root, Leaf] order
	// MS-RDPBCGR: "root-certificate-first order"
	chain := &X509CertificateChain{
		CertBlobArray: []CertBlob{
			{AbCert: rootDer},
			{AbCert: leafDer},
		},
	}
	chain.NumCertBlobs = uint32(len(chain.CertBlobArray))

	// 4. Call GetPublicKey
	exp, mod := chain.GetPublicKey()

	// 5. Verify results - Expecting Leaf Key
	if exp == 0 && mod == nil {
		t.Fatal("GetPublicKey returned (0, nil), expected valid key")
	}

	if exp != uint32(leafKey.PublicKey.E) {
		t.Errorf("Expected exponent %d, got %d", leafKey.PublicKey.E, exp)
	}

	// Expected modulus should be Little Endian because GetPublicKey returns LE.
	expectedModLE := core.Reverse(leafKey.PublicKey.N.Bytes())

	if string(mod) != string(expectedModLE) {
		t.Errorf("Modulus mismatch")
	}

	// Verify we didn't get the Root key
	rootModLE := core.Reverse(rootKey.PublicKey.N.Bytes())
	if string(mod) == string(rootModLE) {
		t.Errorf("GetPublicKey returned Root key instead of Leaf key")
	}
}

func TestX509CertificateChain_Encrypt(t *testing.T) {
	// Verify Encrypt exists and runs, even if it returns nil
	chain := &X509CertificateChain{}
	res := chain.Encrypt()
	if res != nil {
		t.Logf("Encrypt returned non-nil: %v", res)
	}
}
