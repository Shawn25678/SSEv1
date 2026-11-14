namespace ExileLedger;

// Observes menu-key intent only; never consumes keys or reads game-client state.
sealed class GameMenuVisibility
{
    static readonly Dictionary<string, (uint Key, uint Modifiers)> Defaults = new()
    {
        ["open_inventory_panel"] = (73, 0), ["open_character_panel"] = (67, 0),
        ["open_social_panel"] = (74, 0), ["open_ladder_panel"] = (76, 0),
        ["open_challenges_panel"] = (72, 0), ["open_cosmetics_inventory"] = (75, 0),
        ["open_world_panel"] = (85, 0), ["open_passive_skills_panel"] = (80, 0),
        ["open_atlas_passives_screen"] = (85, 2), ["open_microtransaction_panel"] = (77, 0),
        ["open_options"] = (79, 0), ["open_skill_panel"] = (71, 0),
        ["open_market_panel"] = (191, 0), ["open_expedition_panel"] = (66, 0),
        ["generic_league_panel_key"] = (222, 0), ["open_map"] = (9, 0),
        ["chat"] = (13, 0), ["close_panels"] = (32, 0),
    };
    Dictionary<string, (uint Key, uint Modifiers)> _bindings = new(Defaults);
    readonly HashSet<string> _open = new();
    readonly HashSet<uint> _held = new();
    bool _chat;
    public bool Hidden => _chat || _open.Count > 0;

    public void Configure(IEnumerable<string> lines)
    {
        var sections = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase);
        var section = "";
        string? mode = null;
        foreach (var raw in lines)
        {
            var line = raw.Trim();
            if (line.StartsWith('[') && line.EndsWith(']')) { section = line[1..^1]; continue; }
            var split = line.IndexOf('=');
            if (split < 1) continue;
            var name = line[..split].Trim();
            var value = line[(split + 1)..].Trim();
            if (name == "user_input_mode") mode = value;
            if (section is not ("ACTION_KEYS" or "WASD_ACTION_KEYS") || !Defaults.ContainsKey(name)) continue;
            if (!sections.TryGetValue(section, out var entries)) sections[section] = entries = new();
            entries[name] = value;
        }
        _bindings = new(Defaults);
        var selected = mode == "wasd" && sections.ContainsKey("WASD_ACTION_KEYS") ? "WASD_ACTION_KEYS" : "ACTION_KEYS";
        if (!sections.TryGetValue(selected, out var bindings)) return;
        foreach (var (name, value) in bindings)
        {
            var parts = value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0 || !uint.TryParse(parts[0], out var key)) continue;
            var modifiers = parts.Length > 1 ? parts[1] switch { "1" => 4u, "2" => 2u, "3" => 1u, _ => 0u } : 0u;
            _bindings[name] = (key, modifiers);
        }
    }

    public void ClearHeldKeys() => _held.Clear();

    public void Reset()
    {
        _open.Clear();
        _held.Clear();
        _chat = false;
    }

    public void Observe(uint key, bool down, uint modifiers, bool gameFocused)
    {
        if (!down) { _held.Remove(key); return; }
        if (!gameFocused || !_held.Add(key)) return;
        if (key == 27 && modifiers == 0)
        {
            if (_chat) _chat = false;
            else if (_open.Count > 0) _open.Clear();
            else _open.Add("escape-menu");
            return;
        }
        if (_bindings.TryGetValue("chat", out var chat) && key == chat.Key &&
            (modifiers == chat.Modifiers || (key == 13 && modifiers is 2 or 4)))
        {
            _chat = !_chat;
            return;
        }
        if (_chat) return; // Typing I/C/P/etc. in chat must not toggle tracked panels.
        if (_bindings.TryGetValue("close_panels", out var close) && key == close.Key && modifiers == close.Modifiers)
        {
            _open.Clear();
            return;
        }
        foreach (var (name, binding) in _bindings)
        {
            if (name is "chat" or "close_panels" || binding.Key == 0 || binding.Key != key || binding.Modifiers != modifiers) continue;
            // One full panel at a time. The same key closes it; a different panel replaces it.
            if (_open.Count == 1 && _open.Contains(name)) _open.Clear();
            else { _open.Clear(); _open.Add(name); }
            return;
        }
    }
}
