// Package docs embeds the JSON for docs
// and handles searching through said JSON
package docs

import (
	_ "embed"
	"encoding/json"
)

//go:embed docs.json
var rawDocsJSON []byte

type PluginDoc struct {
	Name           string           `json:"name"`
	PrettyName     string           `json:"prettyName"`
	Typ            string           `json:"type"`
	DefaultOptions map[string]any   `json:"defaultOptions"`
	Config         string           `json:"config"`
	Commands       []map[string]any `json:"commands"`
}

func Parse() ([]PluginDoc, error) {
	var docs []PluginDoc
	if err := json.Unmarshal(rawDocsJSON, &docs); err != nil {
		return nil, err
	}

	return docs, nil
}

func All(docs []PluginDoc) []PluginDoc {
	return docs
}

func ByName(docs []PluginDoc, name string) *PluginDoc {
	for _, plugin := range docs {
		if plugin.Name == name {
			return &plugin
		}
	}

	return nil
}
