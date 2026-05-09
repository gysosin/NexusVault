package api

type registrationPolicyDecision struct {
	Allowed bool
	Role    string
}

func registrationDecision(allowPublicRegistration bool, existingUserCount int) registrationPolicyDecision {
	if existingUserCount <= 0 {
		return registrationPolicyDecision{Allowed: true, Role: "admin"}
	}

	if allowPublicRegistration {
		return registrationPolicyDecision{Allowed: true, Role: "user"}
	}

	return registrationPolicyDecision{Allowed: false}
}
