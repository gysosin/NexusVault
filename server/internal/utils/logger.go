package utils

import (
	"log"
)

func Log(v ...interface{}) {
	log.Println(v...)
}

func Logf(format string, v ...interface{}) {
	log.Printf(format, v...)
}
