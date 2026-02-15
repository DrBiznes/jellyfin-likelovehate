namespace Jellyfin.Plugin.LikeLoveHate;

/// <summary>
/// Payload class for the File Transformation callback.
/// The File Transformation plugin deserializes a JObject with "contents" into this type.
/// </summary>
public class TransformationCallbackPayload
{
    /// <summary>
    /// Gets or sets the HTML contents of the file being transformed.
    /// </summary>
    public string? Contents { get; set; }
}
