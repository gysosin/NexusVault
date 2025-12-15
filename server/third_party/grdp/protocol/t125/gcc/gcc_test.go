package gcc

import (
	"bytes"
	"crypto/md5"
	"crypto/rand"
	"crypto/rsa"
	"encoding/binary"
	"log"
	"math/big"
	"os"
	"testing"

	"github.com/tomatome/grdp/core"
	"github.com/tomatome/grdp/glog"
)

func TestProprietaryServerCertificate_Verify(t *testing.T) {
	// Initialize glog to avoid panic
	glog.SetLogger(log.New(os.Stdout, "", 0))
	glog.SetLevel(glog.NONE)

	// 1. Generate RSA Key
    // Use 1024 bits to avoid insecure key error (Go 1.20+ restrictions)
	privKey, err := rsa.GenerateKey(rand.Reader, 1024)
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}
	pubKey := privKey.PublicKey

	// Modulus (Big Endian from key) -> Little Endian
	// We make a copy because Reverse modifies in place
	modulus := make([]byte, len(pubKey.N.Bytes()))
	copy(modulus, pubKey.N.Bytes())
	core.Reverse(modulus)

	keyLen := uint32(len(modulus) + 8)

	// 2. Create Certificate
	cert := &ProprietaryServerCertificate{
		DwSigAlgId:        1,
		DwKeyAlgId:        1,
		PublicKeyBlobType: 6,
		PublicKeyBlobLen:  uint16(keyLen + 20),
		PublicKeyBlob: RSAPublicKey{
			Magic:   0x31415352,
			Keylen:  keyLen,
			Bitlen:  1024,
			Datalen: uint32(len(modulus)),
			PubExp:  uint32(pubKey.E),
			Modulus: modulus,
			Padding: make([]byte, 8),
		},
		SignatureBlobType: 8,
		SignatureBlobLen:  uint16(len(modulus) + 8),
		SignatureBlob:     nil,
		Padding:           make([]byte, 8),
	}

	// 3. Serialize Data to Sign (Manual packing to match what we expect Verify to do)
	buf := new(bytes.Buffer)
	binary.Write(buf, binary.LittleEndian, cert.DwSigAlgId)
	binary.Write(buf, binary.LittleEndian, cert.DwKeyAlgId)
	binary.Write(buf, binary.LittleEndian, cert.PublicKeyBlobType)
	binary.Write(buf, binary.LittleEndian, cert.PublicKeyBlobLen)

	// PublicKeyBlob
	pk := cert.PublicKeyBlob
	binary.Write(buf, binary.LittleEndian, pk.Magic)
	binary.Write(buf, binary.LittleEndian, pk.Keylen)
	binary.Write(buf, binary.LittleEndian, pk.Bitlen)
	binary.Write(buf, binary.LittleEndian, pk.Datalen)
	binary.Write(buf, binary.LittleEndian, pk.PubExp)
	buf.Write(pk.Modulus)
	buf.Write(pk.Padding)

	// 4. Compute Hash
	hash := md5.Sum(buf.Bytes())

	// 5. Sign (m^d mod n)
	// Construct m: [Hash] [00...00] (Little Endian bytes)
	// Size should equal modulus size
	mBytes := make([]byte, len(modulus))
	copy(mBytes, hash[:])

	// Convert mBytes (LE) to BigInt (BE)
	core.Reverse(mBytes)
	mInt := new(big.Int).SetBytes(mBytes)

	// Compute s = m^d mod n
	sInt := new(big.Int).Exp(mInt, privKey.D, privKey.N)

	// Convert s to Bytes (BE)
	sBytes := sInt.Bytes()
	// Pad to modulus size
	if len(sBytes) < len(modulus) {
		padding := make([]byte, len(modulus)-len(sBytes))
		sBytes = append(padding, sBytes...)
	}

	// Convert s to LE
	core.Reverse(sBytes)
	cert.SignatureBlob = sBytes

	// 6. Verify (Expect True)
	if !cert.Verify() {
		t.Fatal("Verify() returned false for valid signature")
	}

	// 7. Test invalid signature (Expect False)
	cert.SignatureBlob[0] ^= 0xFF
	if cert.Verify() {
		t.Fatal("Verify() returned true for invalid signature")
	}
}
