package permissions

type APIPermission string

const (
	ViewGuild    APIPermission = "VIEW_GUILD"
	ReadConfig   APIPermission = "READ_CONFIG"
	EditConfig   APIPermission = "EDIT_CONFIG"
	ManageAccess APIPermission = "MANAGE_ACCESS"
	Owner        APIPermission = "OWNER"
)

var All = []APIPermission{ViewGuild, ReadConfig, EditConfig, ManageAccess, Owner}
