using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.RegularExpressions;
using Jellyfin.Plugin.LikeLoveHate.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace Jellyfin.Plugin.LikeLoveHate;

/// <summary>
/// The LikeLoveHate plugin — lets users react to media with Like, Love, or Hate.
/// Uses File Transformation plugin to inject client-side script into index.html.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private const string PluginName = "LikeLoveHate";

    /// <summary>
    /// Initializes a new instance of the <see cref="Plugin"/> class.
    /// </summary>
    /// <param name="applicationPaths">Instance of the <see cref="IApplicationPaths"/> interface.</param>
    /// <param name="xmlSerializer">Instance of the <see cref="IXmlSerializer"/> interface.</param>
    /// <param name="logger">Instance of the <see cref="ILogger{Plugin}"/> interface.</param>
    /// <param name="configurationManager">Instance of the <see cref="IServerConfigurationManager"/> interface.</param>
    public Plugin(
        IApplicationPaths applicationPaths,
        IXmlSerializer xmlSerializer,
        ILogger<Plugin> logger,
        IServerConfigurationManager configurationManager)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;

        try
        {
            logger.LogInformation("{PluginName} plugin is initializing...", PluginName);

            // Store config for the static callback
            CachedBasePath = GetBasePath(configurationManager, logger);
            CachedVersion = GetType().Assembly.GetName().Version?.ToString() ?? "0.0.0.0";

            if (Configuration.InjectClientScript)
            {
                if (!TryRegisterFileTransformation(logger))
                {
                    logger.LogWarning("{PluginName}: File Transformation plugin not available — script injection will not work. Install the File Transformation plugin.", PluginName);
                }
            }

            logger.LogInformation("{PluginName} plugin initialization completed.", PluginName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "{PluginName}: Error during plugin initialization", PluginName);
        }
    }

    /// <summary>
    /// Gets the current plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <summary>
    /// Gets the cached base URL path for use by the static callback.
    /// </summary>
    internal static string CachedBasePath { get; private set; } = string.Empty;

    /// <summary>
    /// Gets the cached plugin version for use by the static callback.
    /// </summary>
    internal static string CachedVersion { get; private set; } = "0.0.0.0";

    /// <inheritdoc />
    public override string Name => PluginName;

    /// <inheritdoc />
    public override Guid Id => Guid.Parse("a7b3c1d2-4e5f-6789-abcd-ef0123456789");

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        return
        [
            new PluginPageInfo
            {
                Name = Name,
                EmbeddedResourcePath = string.Format(CultureInfo.InvariantCulture, "{0}.Configuration.configPage.html", GetType().Namespace),
            },
        ];
    }

    /// <summary>
    /// Static callback invoked by the File Transformation plugin via reflection.
    /// Receives an object with a "Contents" property containing the HTML, returns transformed HTML.
    /// </summary>
    /// <param name="payload">Object with a Contents property containing the current index.html content.</param>
    /// <returns>The transformed HTML with the LikeLoveHate script tag injected.</returns>
    public static string TransformIndexHtml(TransformationCallbackPayload payload)
    {
        var html = payload.Contents ?? string.Empty;
        var scriptElement = BuildScriptTag(CachedBasePath, CachedVersion);

        if (html.Contains(scriptElement, StringComparison.Ordinal))
        {
            return html;
        }

        // Remove old versions of our script tag
        html = Regex.Replace(html, @"<script plugin=""LikeLoveHate"".*?></script>", string.Empty);

        int bodyClose = html.LastIndexOf("</body>", StringComparison.Ordinal);
        if (bodyClose == -1)
        {
            return html;
        }

        html = html.Insert(bodyClose, scriptElement);
        return html;
    }

    /// <summary>
    /// Attempts to register transformation with File Transformation plugin via reflection.
    /// </summary>
    private bool TryRegisterFileTransformation(ILogger<Plugin> logger)
    {
        try
        {
            Assembly? ftAssembly = AssemblyLoadContext.All
                .SelectMany(x => x.Assemblies)
                .FirstOrDefault(x => x.FullName?.Contains("FileTransformation", StringComparison.OrdinalIgnoreCase) ?? false);

            if (ftAssembly == null)
            {
                logger.LogDebug("{PluginName}: File Transformation assembly not found", PluginName);
                return false;
            }

            Type? pluginInterfaceType = ftAssembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");
            if (pluginInterfaceType == null)
            {
                logger.LogWarning("{PluginName}: PluginInterface type not found in File Transformation assembly", PluginName);
                return false;
            }

            MethodInfo? registerMethod = pluginInterfaceType.GetMethod("RegisterTransformation");
            if (registerMethod == null)
            {
                logger.LogWarning("{PluginName}: RegisterTransformation method not found", PluginName);
                return false;
            }

            // Build the JObject payload that RegisterTransformation expects
            var payload = new JObject
            {
                ["id"] = Id.ToString(),
                ["fileNamePattern"] = "index.html",
                ["callbackAssembly"] = GetType().Assembly.FullName,
                ["callbackClass"] = typeof(Plugin).FullName,
                ["callbackMethod"] = nameof(TransformIndexHtml),
            };

            registerMethod.Invoke(null, new object[] { payload });

            logger.LogInformation("{PluginName}: Registered with File Transformation plugin", PluginName);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "{PluginName}: Failed to register with File Transformation plugin", PluginName);
            return false;
        }
    }

    /// <summary>
    /// Builds the script element to inject.
    /// </summary>
    private static string BuildScriptTag(string basePath, string version)
    {
        return $"<script plugin=\"LikeLoveHate\" version=\"{version}\" src=\"{basePath}/LikeLoveHate/ClientScript\" defer></script>";
    }

    /// <summary>
    /// Gets the configured base URL path from network configuration.
    /// </summary>
    private static string GetBasePath(IServerConfigurationManager configurationManager, ILogger<Plugin> logger)
    {
        try
        {
            var networkConfig = configurationManager.GetConfiguration("network");
            var baseUrlProp = networkConfig.GetType().GetProperty("BaseUrl");
            var baseUrl = baseUrlProp?.GetValue(networkConfig)?.ToString()?.Trim('/');
            return string.IsNullOrEmpty(baseUrl) ? string.Empty : "/" + baseUrl;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "{PluginName}: Unable to get base path, using default", PluginName);
            return string.Empty;
        }
    }
}
