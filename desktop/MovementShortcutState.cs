namespace ExileLedger;

// Physical key state only. Injected copy/release events bypass this guard.
sealed class MovementShortcutState
{
    readonly HashSet<uint> _down = new();
    readonly HashSet<uint> _blocked = new();

    public readonly record struct Decision(bool Block, int Action, bool ReleaseMovement);

    public Decision Handle(uint key, bool down, bool gameFocused, uint modifiers,
        IReadOnlyList<(int id, uint modifiers, uint key)> bindings, int unavailableFirst = 0, int unavailableSecond = 0)
    {
        if (!down)
        {
            _down.Remove(key);
            var blocked = _blocked.Remove(key);
            return new Decision(gameFocused && blocked, 0, false);
        }
        var wasDown = !_down.Add(key);
        if (!gameFocused) return default;
        if (_blocked.Contains(key)) return new Decision(true, 0, false);
        foreach (var binding in bindings)
        {
            if (binding.key != key || (binding.modifiers & 15) != modifiers) continue;
            if (binding.id == unavailableFirst || binding.id == unavailableSecond) continue;
            _blocked.Add(key);
            return new Decision(true, binding.id, wasDown);
        }
        return default;
    }

    public void Clear()
    {
        _down.Clear();
        _blocked.Clear();
    }
}
