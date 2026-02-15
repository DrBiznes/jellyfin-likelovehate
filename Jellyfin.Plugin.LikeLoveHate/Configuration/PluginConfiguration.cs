using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.LikeLoveHate.Configuration;

/// <summary>
/// Plugin configuration for LikeLoveHate.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PluginConfiguration"/> class.
    /// </summary>
    public PluginConfiguration()
    {
        EnableActivityLog = true;
    }

    /// <summary>
    /// Gets or sets a value indicating whether reactions are logged to the activity log.
    /// </summary>
    public bool EnableActivityLog { get; set; }
}
