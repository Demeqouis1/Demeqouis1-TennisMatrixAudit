# Active Rule Registry

Rule documents are uploaded, parsed, completeness-checked, diffed, and activated only as immutable versions. The runtime must reject activation when expected and parsed rule counts differ or when any block is unmapped/ambiguous.

The supplied Verification Audit, Disagreement Audit, Metrics, and Final Record documents are the governing inputs. Repeated specification text is deduplicated by document/rule identity and does not create duplicate runtime rules.
