// Package permissions contains our functions for config / dashboard permissions.
package permissions

import "slices"

type APIPermission string

const (
	ViewGuild    APIPermission = "VIEW_GUILD"
	ReadConfig   APIPermission = "READ_CONFIG"
	EditConfig   APIPermission = "EDIT_CONFIG"
	ManageAccess APIPermission = "MANAGE_ACCESS"
	Owner        APIPermission = "OWNER"
)

var Hierarchy = []APIPermission{
	Owner,
	ManageAccess,
	EditConfig,
	ReadConfig,
	ViewGuild,
}

// Check if a given permission gives you access to a child level
func IsPermitted(granted []APIPermission, target APIPermission) bool {
	for _, perm := range granted {
		grantedPerm := slices.Index(Hierarchy, perm)
		targetPerm := slices.Index(Hierarchy, target)
		if grantedPerm != -1 && targetPerm != -1 && grantedPerm <= targetPerm {
			return true
		}
	}

	return false
}
