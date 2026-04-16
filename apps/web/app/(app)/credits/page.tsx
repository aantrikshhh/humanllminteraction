import Link from "next/link";

import {
  assetManifestExample,
  formatCreditLine,
  formatUsageSurfaceLabel,
  groupAssetCreditsBySource,
  summarizeManifest
} from "@arena/theme";

import styles from "./page.module.css";

const summary = summarizeManifest(assetManifestExample);
const groupedCredits = groupAssetCreditsBySource(assetManifestExample);

export default function CreditsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>Credits</div>
            <h1 className={styles.title}>Asset governance, not a forgotten footer.</h1>
            <p className={styles.intro}>
              ARENA keeps source policy and per-asset credits explicit. We credit every approved
              pack we use even when a license does not require it, and OpenGameArt stays
              per-asset only after license review.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} href="/lobby">
                Return to lobby
              </Link>
              <Link className={styles.secondaryAction} href="/results">
                View results surfaces
              </Link>
            </div>
          </div>

          <div className={styles.metrics} aria-label="Manifest summary">
            <div>
              <span>Manifested assets</span>
              <strong>{summary.totalAssets}</strong>
            </div>
            <div>
              <span>Sources in use</span>
              <strong>{summary.sourcesUsed}</strong>
            </div>
            <div>
              <span>Legally required credits</span>
              <strong>{summary.requiredCredits}</strong>
            </div>
          </div>
        </section>

        <section className={styles.policySection}>
          <div className={styles.sectionHeading}>
            <div>
              <div className={styles.eyebrow}>Approved sources</div>
              <h2>Policy before pixels</h2>
            </div>
            <p>
              These are the approved asset sources for the current repo. A source being approved
              does not mean every asset can be dropped in blindly; the policy column defines how
              strict the team has to be.
            </p>
          </div>

          <div className={styles.policyRail}>
            {groupedCredits.map(({ source, assets }) => (
              <article className={styles.policyBlock} key={source.sourceId}>
                <div className={styles.policyTopline}>
                  <span>{source.source}</span>
                  <span className={styles.policyBadge}>{source.attributionMode}</span>
                </div>
                <h3>{source.defaultLicense}</h3>
                <p className={styles.policyBody}>
                  {source.researchNotes[0]} {source.researchNotes[1]}
                </p>
                <dl className={styles.policyMeta}>
                  <div>
                    <dt>Commercial use</dt>
                    <dd>{source.commercialUse}</dd>
                  </div>
                  <div>
                    <dt>Project policy</dt>
                    <dd>Always credit if used</dd>
                  </div>
                  <div>
                    <dt>Manifested assets</dt>
                    <dd>{assets.length}</dd>
                  </div>
                </dl>
                <div className={styles.linkRow}>
                  <a href={source.homepageUrl} target="_blank" rel="noreferrer">
                    Source
                  </a>
                  <a href={source.policyUrl} target="_blank" rel="noreferrer">
                    Policy
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.assetSection}>
          <div className={styles.sectionHeading}>
            <div>
              <div className={styles.eyebrow}>Manifest entries</div>
              <h2>Concrete credits by pack and usage surface</h2>
            </div>
            <p>
              The page below is driven from the theme manifest example. In production, the same
              structure can be generated from the real asset registry and shown here without
              changing the route shape.
            </p>
          </div>

          <div className={styles.assetGroups}>
            {groupedCredits.map(({ source, assets }) => (
              <section className={styles.assetGroup} key={source.sourceId}>
                <div className={styles.assetGroupHeader}>
                  <div>
                    <div className={styles.groupLabel}>{source.source}</div>
                    <h3>{assets.length === 0 ? "No declared assets yet" : `${assets.length} declared assets`}</h3>
                  </div>
                  <p>
                    {source.sourceId === "opengameart"
                      ? "Do not add an OpenGameArt asset without copying its exact asset page, author, and license into the manifest."
                      : "This project credits these assets even when the underlying license allows omission."}
                  </p>
                </div>

                {assets.length === 0 ? (
                  <div className={styles.emptyState}>
                    No manifest entries are declared for this source yet.
                  </div>
                ) : (
                  <div className={styles.assetList}>
                    {assets.map((asset) => (
                      <article className={styles.assetRow} key={asset.assetId}>
                        <div className={styles.assetMain}>
                          <div className={styles.assetTopline}>
                            <span>{asset.pack}</span>
                            <span>{asset.license}</span>
                          </div>
                          <h4>{asset.assetName}</h4>
                          <p>{asset.notes}</p>
                          <div className={styles.usageChips}>
                            {asset.usedIn.map((surface) => (
                              <span className={styles.usageChip} key={surface}>
                                {formatUsageSurfaceLabel(surface)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className={styles.assetSide}>
                          <div className={styles.creditBlock}>
                            <span className={styles.creditLabel}>Credit line</span>
                            <p>{formatCreditLine(asset)}</p>
                          </div>
                          <div className={styles.linkRow}>
                            <a href={asset.assetUrl} target="_blank" rel="noreferrer">
                              Asset page
                            </a>
                            <a href={asset.licenseUrl} target="_blank" rel="noreferrer">
                              License basis
                            </a>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
