// Package docs embeds the JSON for docs
// and handles searching through said JSON
package docs

import (
	_ "embed"
	"encoding/json"
)

//go:embed docs.json
var rawDocsJSON []byte

type PluginDocInfo struct {
	PrettyName  string `json:"prettyName"`
	Description string `json:"description"`
	Typ         string `json:"type"`
}

type PluginDoc struct {
	Name            string           `json:"name"`
	Info            PluginDocInfo    `json:"info"`
	DefaultOptions  map[string]any   `json:"defaultOptions"`
	Config          string           `json:"configSchema"`
	MessageCommands []map[string]any `json:"messageCommands"`
}

type PluginOverview struct {
	Name string        `json:"name"`
	Info PluginDocInfo `json:"info"`
}

func Parse() ([]PluginDoc, error) {
	var docs []PluginDoc
	if err := json.Unmarshal(rawDocsJSON, &docs); err != nil {
		return nil, err
	}

	return docs, nil
}

func All(docs []PluginDoc) []PluginOverview {
	overview := make([]PluginOverview, len(docs))

	for i, doc := range docs {
		overview[i] = PluginOverview{
			Name: doc.Name,
			Info: doc.Info,
		}
	}

	return overview
}

func ByName(docs []PluginDoc, name string) *PluginDoc {
	for _, plugin := range docs {
		if plugin.Name == name {
			return &plugin
		}
	}

	return nil
}
