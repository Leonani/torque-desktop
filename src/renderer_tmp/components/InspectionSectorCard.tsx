import React from 'react';
import { Card, Input, Typography, Space, Radio } from 'antd';
import type { InspectionSector } from '../types';
import { sectorNames, lightingRows } from '../utils/inspectionData';
import styles from './InspectionSectorCard.module.css';

const { Text } = Typography;
const { TextArea } = Input;

interface InspectionSectorCardProps {
  sector: InspectionSector;
  onItemChange: (itemIndex: number, status: 'ok' | 'revision') => void;
  onNoteChange: (itemIndex: number, notes: string) => void;
  readOnly?: boolean;
}

const InspectionSectorCard: React.FC<InspectionSectorCardProps> = ({
  sector,
  onItemChange,
  onNoteChange,
  readOnly = false,
}) => {
  const hasItems = sector.items.length > 0;

  const renderRadio = (index: number) => {
    if (index === -1) return <span className={styles.dashCell}>—</span>;
    const item = sector.items[index];
    return (
      <div className={styles.radioCell}>
        <Radio.Group
          value={item.status || 'ok'}
          onChange={(e) => onItemChange(index, e.target.value)}
          disabled={readOnly}
          size="small"
        >
          <Radio.Button value="ok">OK</Radio.Button>
          <Radio.Button value="revision">R</Radio.Button>
        </Radio.Group>
      </div>
    );
  };

  /** Renderiza iluminación con dos paneles (izquierdo/derecho) y divisor continuo */
  const renderLightingGrid = () => (
    <>
      <div className={styles.lightingContainer}>
        {/* Panel izquierdo: Item | Delanteras | Traseras */}
        <div className={styles.lightingSide}>
          <div className={styles.lightingGridLeft}>
            <div className={styles.lightingHeader}>Luz</div>
            <div className={styles.lightingHeaderCenter}>Delanteras</div>
            <div className={styles.lightingHeaderCenter}>Traseras</div>
            {lightingRows.map((row, rowIndex) => (
              <React.Fragment key={`left-${rowIndex}`}>
                <div className={styles.lightingLabel}>{row.leftLabel}</div>
                {row.delantera != null
                  ? renderRadio(row.delantera)
                  : <span className={styles.dashCell}>—</span>}
                {row.trasera != null
                  ? renderRadio(row.trasera)
                  : <span className={styles.dashCell}>—</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Divisor vertical continuo */}
        <div className={styles.lightingDivider} />

        {/* Panel derecho: Item | Traseras */}
        <div className={styles.lightingSide}>
          <div className={styles.lightingGridRight}>
            <div className={styles.lightingHeader}>Luz</div>
            <div className={styles.lightingHeaderCenter}>Traseras</div>
            {lightingRows
              .filter((row) => row.rightLabel != null)
              .map((row, rowIndex) => (
                <React.Fragment key={`right-${rowIndex}`}>
                  <div className={styles.lightingLabel}>{row.rightLabel}</div>
                  {row.rightTrasera != null
                    ? renderRadio(row.rightTrasera)
                    : <span className={styles.dashCell}>—</span>}
                </React.Fragment>
              ))}
          </div>
        </div>
      </div>

      {/* Notas de items en revisión */}
      {sector.items.some((item) => item.status === 'revision') && (
        <div className={styles.notesSection}>
          <div className={styles.notesTitle}>Items en revisión</div>
          {sector.items
            .map((item, idx) => ({ ...item, idx }))
            .filter((item) => item.status === 'revision')
            .map((item) => (
              <div key={item.idx} className={styles.notesItem}>
                <Text strong style={{ fontSize: 12 }}>
                  {item.name}
                </Text>
                {!readOnly ? (
                  <TextArea
                    placeholder="Notas sobre la revisión..."
                    value={item.notes}
                    onChange={(e) => onNoteChange(item.idx, e.target.value)}
                    rows={2}
                    style={{ marginTop: 4, fontSize: 12 }}
                  />
                ) : item.notes ? (
                  <Text
                    type="secondary"
                    style={{ display: 'block', marginTop: 4, fontSize: 12 }}
                  >
                    {item.notes}
                  </Text>
                ) : null}
              </div>
            ))}
        </div>
      )}
    </>
  );

  return (
    <Card
      className="inspection-sector-card"
    >
      <Text
        strong
        style={{
          display: 'block',
          marginBottom: 8,
          backgroundColor: 'var(--theme-bg-spotlight)',
          padding: '4px 8px',
          borderRadius: 4,
        }}
      >
        {sectorNames[sector.sector]}
      </Text>
      {hasItems ? (
        sector.sector === 'iluminacion' ? (
          renderLightingGrid()
        ) : sector.sector === 'varios' ? (
          <div style={{ padding: '4px 0' }}>
            {!readOnly ? (
              <TextArea
                placeholder="Comentarios adicionales..."
                value={sector.items[0]?.notes || ''}
                onChange={(e) => onNoteChange(0, e.target.value)}
                rows={4}
                style={{ fontSize: 14 }}
              />
            ) : sector.items[0]?.notes ? (
              <Text style={{ whiteSpace: 'pre-wrap' }}>{sector.items[0].notes}</Text>
            ) : (
              <Text type="secondary">Sin comentarios</Text>
            )}
          </div>
        ) : (
          <Space orientation="vertical" style={{ width: '100%' }}>
            {sector.items.map((item, index) => (
              <div key={index} className="inspection-item">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <Text>{item.name}</Text>
                  {renderRadio(index)}
                </div>
                {item.status === 'revision' && !readOnly && (
                  <TextArea
                    placeholder="Notas sobre la revisión..."
                    value={item.notes}
                    onChange={(e) => onNoteChange(index, e.target.value)}
                    rows={2}
                    style={{ marginTop: 8 }}
                  />
                )}
                {item.status === 'revision' && readOnly && item.notes && (
                  <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                    Notas: {item.notes}
                  </Text>
                )}
              </div>
            ))}
          </Space>
        )
      ) : null}
    </Card>
  );
};

export default InspectionSectorCard;

