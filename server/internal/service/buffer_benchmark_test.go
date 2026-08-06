package service

import (
	"bytes"
	"strings"
	"testing"
)

func BenchmarkStringConcat(b *testing.B) {
	var buffer string
	data := "some data to append which has some length to it"
	limit := 100000

	// Pre-fill
	buffer = strings.Repeat("a", limit)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if len(buffer) > limit {
			buffer = buffer[len(buffer)-limit:]
		}
		buffer += data
	}
}

func BenchmarkBytesBuffer(b *testing.B) {
	var buf bytes.Buffer
	data := []byte("some data to append which has some length to it")
	limit := 100000

	// Pre-fill
	buf.Write(bytes.Repeat([]byte("a"), limit))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		buf.Write(data)
		if buf.Len() > limit {
			buf.Next(buf.Len() - limit)
		}
	}
}

func BenchmarkSafeBuffer(b *testing.B) {
	sb := NewSafeBuffer()
	data := "some data to append which has some length to it"
	limit := 100000

	// Pre-fill
	sb.Append(strings.Repeat("a", limit))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sb.Append(data)
	}
}
