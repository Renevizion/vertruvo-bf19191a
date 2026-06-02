import { FlyerTemplate } from "./FlyerTemplates";
import { FlyerData } from "./FlyerEditorForm";

interface FlyerPreviewProps {
  template: FlyerTemplate;
  data: FlyerData;
  format: "print" | "social";
}

export function FlyerPreview({ template, data, format }: FlyerPreviewProps) {
  const { colors } = template;
  const isSocial = format === "social";
  const width = isSocial ? 540 : 510;
  const height = isSocial ? 540 : 660;

  if (template.category === "schedule") {
    return (
      <div
        id="flyer-preview"
        className="mx-auto overflow-hidden"
        style={{
          width,
          minHeight: height,
          background: `linear-gradient(175deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{ padding: isSocial ? "24px 24px 16px" : "32px 32px 20px", textAlign: "center" }}>
          <h1 style={{
            color: "#fff",
            fontSize: isSocial ? 26 : 28,
            fontWeight: 900,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: 2,
            textShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}>
            {data.header.title || "Program Schedule"}
          </h1>
          {data.header.subtitle && (
            <p style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 13,
              margin: "8px 0 0",
              fontWeight: 500,
              letterSpacing: 1,
            }}>{data.header.subtitle}</p>
          )}
          <div style={{
            width: 60,
            height: 3,
            background: "rgba(255,255,255,0.4)",
            borderRadius: 2,
            margin: "12px auto 0",
          }} />
        </div>

        {/* Table */}
        <div style={{ padding: isSocial ? "0 16px 16px" : "0 24px 24px" }}>
          <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isSocial ? 11 : 12 }}>
              <thead>
                <tr>
                  {template.columns.map(col => (
                    <th
                      key={col.key}
                      style={{
                        background: colors.primary,
                        color: "#fff",
                        padding: "10px 12px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: isSocial ? 10 : 11,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i}>
                    {template.columns.map(col => (
                      <td
                        key={col.key}
                        style={{
                          padding: "9px 12px",
                          borderBottom: "1px solid #eef2f7",
                          color: "#2c3e50",
                          fontWeight: col.key === "price" ? 700 : 400,
                          background: i % 2 === 0 ? "#fff" : "#f8fafc",
                        }}
                      >
                        {row[col.key] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        {(data.footer.phone || data.footer.website) && (
          <div style={{
            padding: "16px 24px",
            textAlign: "center",
            background: "rgba(0,0,0,0.15)",
          }}>
            {data.footer.phone && (
              <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0 }}>{data.footer.phone}</p>
            )}
            {data.footer.website && (
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, margin: "4px 0 0", fontWeight: 500 }}>{data.footer.website}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (template.category === "promo") {
    return (
      <div
        id="flyer-preview"
        className="mx-auto overflow-hidden"
        style={{
          width,
          minHeight: height,
          background: `linear-gradient(180deg, #fff 0%, #f0f4f8 100%)`,
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          borderRadius: 8,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          border: `3px solid ${colors.primary}`,
        }}
      >
        {/* Top accent bar */}
        <div style={{
          height: 6,
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
        }} />

        {/* Title */}
        <div style={{ padding: "24px 24px 16px", textAlign: "center" }}>
          <h1 style={{
            color: colors.primary,
            fontSize: 22,
            fontWeight: 900,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}>
            {data.header.title || "Promo / Pass"}
          </h1>
        </div>

        <div style={{ padding: "0 28px 20px" }}>
          {data.header.headline && (
            <p style={{
              fontSize: isSocial ? 22 : 24,
              fontWeight: 900,
              textAlign: "center",
              color: colors.primary,
              margin: "0 0 12px",
              lineHeight: 1.2,
            }}>
              {data.header.headline}
            </p>
          )}
          {data.header.subheadline && (
            <div style={{ textAlign: "center", margin: "0 0 16px" }}>
              <span style={{
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`,
                color: "#fff",
                padding: "6px 20px",
                borderRadius: 30,
                fontSize: 14,
                fontWeight: 700,
                display: "inline-block",
              }}>
                {data.header.subheadline}
              </span>
            </div>
          )}

          {data.header.effective_dates && (
            <div style={{
              border: `2px solid ${colors.primary}`,
              borderRadius: 8,
              padding: "14px",
              textAlign: "center",
              margin: "0 0 16px",
              background: `${colors.primary}08`,
            }}>
              <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: colors.primary, textTransform: "uppercase", letterSpacing: 1 }}>
                EFFECTIVE {data.header.effective_dates}
              </p>
              {data.header.rate_info && (
                <p style={{ fontSize: 11, margin: "6px 0 0", color: "#5a6c7d" }}>{data.header.rate_info}</p>
              )}
            </div>
          )}

          {data.bullets.length > 0 && (
            <ul style={{ paddingLeft: 20, margin: "0 0 16px", fontSize: 12, lineHeight: 1.8, color: "#34495e" }}>
              {data.bullets.map((b, i) => (
                <li key={i} style={{ marginBottom: 2 }}>{b}</li>
              ))}
            </ul>
          )}
        </div>

        {(data.footer.hours_weekday || data.footer.hours_weekend) && (
          <div style={{
            borderTop: `2px solid ${colors.primary}15`,
            padding: "16px 24px",
            background: `${colors.primary}08`,
          }}>
            <p style={{
              textAlign: "center",
              fontWeight: 800,
              fontSize: 13,
              margin: "0 0 8px",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: colors.primary,
            }}>
              Hours
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: 12, color: "#5a6c7d" }}>
              {data.footer.hours_weekday && <span>{data.footer.hours_weekday}</span>}
              {data.footer.hours_weekend && <span>{data.footer.hours_weekend}</span>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Program Info template (rich blue gradient)
  return (
    <div
      id="flyer-preview"
      className="mx-auto overflow-hidden"
      style={{
        width,
        minHeight: height,
        background: `linear-gradient(170deg, #1a5276 0%, #154360 40%, #0d2f4f 100%)`,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        color: "#fff",
        borderRadius: 8,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: "absolute",
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.04)",
      }} />
      <div style={{
        position: "absolute",
        bottom: -30,
        left: -30,
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.03)",
      }} />

      <div style={{ padding: isSocial ? "28px 24px" : "36px 36px", textAlign: "center", position: "relative", zIndex: 1 }}>
        {/* Title */}
        <h1 style={{
          fontSize: isSocial ? 30 : 36,
          fontWeight: 900,
          margin: "0 0 12px",
          textTransform: "uppercase",
          letterSpacing: 3,
          textShadow: "0 2px 12px rgba(0,0,0,0.3)",
          lineHeight: 1.1,
        }}>
          {data.header.title || "Program Name"}
        </h1>

        {/* Session badge */}
        {data.header.session_name && (
          <div style={{
            display: "inline-block",
            background: `linear-gradient(135deg, ${colors.accent}, #f5d020)`,
            color: colors.primary,
            padding: "6px 24px",
            fontWeight: 800,
            fontSize: 15,
            margin: "0 0 10px",
            borderRadius: 4,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}>
            {data.header.session_name}
          </div>
        )}

        {data.header.session_dates && (
          <p style={{ fontSize: 14, margin: "8px 0 0", fontWeight: 600, opacity: 0.9 }}>{data.header.session_dates}</p>
        )}
        {data.header.duration && (
          <p style={{ fontSize: 13, margin: "4px 0 12px", opacity: 0.7, fontWeight: 500 }}>{data.header.duration}</p>
        )}

        {/* Price circle */}
        {data.header.price && (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${colors.accent}, #f5d020)`,
            color: colors.primary,
            fontWeight: 900,
            fontSize: 30,
            margin: "12px 0",
            flexDirection: "column",
            lineHeight: 1,
            boxShadow: "0 8px 24px rgba(241,196,15,0.4)",
          }}>
            <span>{data.header.price}</span>
            <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8 }}>Per Person</span>
          </div>
        )}

        {/* Schedule */}
        {data.rows.length > 0 && (
          <div style={{ margin: "20px 0", textAlign: "left" }}>
            <p style={{
              fontWeight: 800,
              fontSize: 13,
              margin: "0 0 12px",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: colors.accent,
            }}>
              Program Schedule
            </p>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden" }}>
              {data.rows.map((row, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                  padding: "10px 16px",
                  borderBottom: i < data.rows.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}>
                  <span style={{ fontWeight: 700, minWidth: 90 }}>{row.day || "—"}</span>
                  <span style={{ fontWeight: 500 }}>{row.time || "—"}</span>
                  <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>{row.dates ? `(${row.dates})` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {data.footer.cta && (
          <div style={{ marginTop: 24 }}>
            <p style={{
              fontWeight: 800,
              fontSize: 16,
              margin: "0 0 8px",
              textTransform: "uppercase",
              color: colors.accent,
              letterSpacing: 1,
            }}>
              {data.footer.cta}
            </p>
          </div>
        )}
        {data.footer.phone && (
          <p style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{data.footer.phone}</p>
        )}
        {data.footer.website && (
          <p style={{ fontSize: 12, opacity: 0.6, margin: 0, fontWeight: 500 }}>{data.footer.website}</p>
        )}
      </div>
    </div>
  );
}