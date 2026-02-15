using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.LikeLoveHate.Configuration;

/// <summary>
/// Plugin configuration for LikeLoveHate.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Gets or sets a value indicating whether the plugin should inject the
    /// client-side script tag into jellyfin-web's index.html.
    /// </summary>
    public bool InjectClientScript { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether to log reactions to the server log.
    /// </summary>
    public bool EnableActivityLog { get; set; } = true;
}
