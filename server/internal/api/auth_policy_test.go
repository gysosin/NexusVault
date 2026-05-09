package api

import "testing"

func TestRegistrationDecisionBootstrapsFirstUserAsAdmin(t *testing.T) {
	decision := registrationDecision(false, 0)

	if !decision.Allowed {
		t.Fatal("registrationDecision(false, 0).Allowed = false, want true")
	}
	if decision.Role != "admin" {
		t.Fatalf("registrationDecision(false, 0).Role = %q, want admin", decision.Role)
	}
}

func TestRegistrationDecisionRejectsLaterUsersWhenPublicRegistrationDisabled(t *testing.T) {
	decision := registrationDecision(false, 1)

	if decision.Allowed {
		t.Fatal("registrationDecision(false, 1).Allowed = true, want false")
	}
}

func TestRegistrationDecisionAllowsLaterUsersWhenPublicRegistrationEnabled(t *testing.T) {
	decision := registrationDecision(true, 3)

	if !decision.Allowed {
		t.Fatal("registrationDecision(true, 3).Allowed = false, want true")
	}
	if decision.Role != "user" {
		t.Fatalf("registrationDecision(true, 3).Role = %q, want user", decision.Role)
	}
}
