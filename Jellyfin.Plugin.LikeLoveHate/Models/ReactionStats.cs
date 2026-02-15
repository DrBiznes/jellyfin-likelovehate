using System;
using System.Collections.Generic;

namespace Jellyfin.Plugin.LikeLoveHate.Models;

/// <summary>
/// Aggregate reaction statistics for a media item.
/// </summary>
public class ReactionStats
{
    /// <summary>
    /// Gets or sets the number of likes.
    /// </summary>
    public int Likes { get; set; }

    /// <summary>
    /// Gets or sets the number of loves.
    /// </summary>
    public int Loves { get; set; }

    /// <summary>
    /// Gets or sets the number of hates.
    /// </summary>
    public int Hates { get; set; }

    /// <summary>
    /// Gets or sets the total number of reactions.
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// Gets the per-user reactions.
    /// </summary>
    public Dictionary<Guid, UserReaction> UserReactions { get; } = new();
}
