import { Modal, Button, Divider } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import { formatDate } from '@/utils/helpers';
import { sectorNames, createEmptyInspections } from '@/utils/inspectionData';
import type { Vehicle, Visit } from '@/types';
import styles from './WorkOrderPrint.module.css';

interface WorkOrderPrintProps {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  visit: Visit;
}

/**
 * Modal de previsualización e impresión de Orden de Trabajo
 * Muestra todos los datos del taller, cliente, vehículo, inspección,
 * productos/servicios asignados, pagos, notas y espacio para firmas.
 * Al hacer clic en "Imprimir" se usa window.print() con @media print.
 */
export function WorkOrderPrint({ open, onClose, vehicle, visit }: WorkOrderPrintProps) {
  const { title, logo, direccion, telefono, email, ciudad } = useTheme();

  // ── Merge de inspecciones ──────────────────────────────────
  const mergeInspections = (v: Visit) => {
    if (!v.inspections || v.inspections.length === 0) return createEmptyInspections();
    const fullInspections = createEmptyInspections();
    return fullInspections.map((fullSector) => {
      const existing = v.inspections.find((s) => s.sector === fullSector.sector);
      if (!existing) return fullSector;
      const mergedItems = fullSector.items.map((fullItem) => {
        const existingItem = existing.items.find((i) => i.name === fullItem.name);
        if (existingItem) {
          return {
            ...fullItem,
            status: existingItem.status || 'ok',
            notes: existingItem.notes || '',
            needsReplacement: existingItem.needsReplacement ?? false,
          };
        }
        return fullItem;
      });
      return { ...fullSector, items: mergedItems };
    });
  };

  // ── Rendering ──────────────────────────────────────────────
  const visitDate = visit.fechaIngreso ? formatDate(visit.fechaIngreso) : formatDate(vehicle.createdAt || '');
  const mergedInspections = mergeInspections(visit);
  const hasInspections = mergedInspections.some(s => s.items.some(i => i.status));
  const hasProducts = (visit.productosAsignados?.length ?? 0) > 0;
  const hasServices = (visit.servicios?.length ?? 0) > 0;
  const hasPayments = (visit.pagos?.length ?? 0) > 0;

  // Calcular totales
  const calcularTotal = (): number => visit.total || 0;
  const calcularPagado = (): number => {
    if (!visit.pagos || visit.pagos.length === 0) return 0;
    return visit.pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
  };
  const calcularDevuelto = (): number => {
    if (!visit.notasCredito || visit.notasCredito.length === 0) return 0;
    return visit.notasCredito.reduce((sum, n) => sum + (n.monto || 0), 0);
  };
  const calcularSaldo = (): number => {
    return calcularTotal() - calcularPagado() + calcularDevuelto();
  };

  // ── Print handler: establece el título del documento ────
  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Orden de Trabajo - ${vehicle.licensePlate.toUpperCase()}`;

    const afterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', afterPrint);
    };

    window.addEventListener('afterprint', afterPrint);
    window.print();

    // Fallback para navegadores que no disparan afterprint
    setTimeout(() => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', afterPrint);
    }, 1000);
  };

  return (
    <Modal
      title="Orden de Trabajo"
      open={open}
      onCancel={onClose}
      width={900}
      centered
      style={{ top: 16 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 140px)',
          overflowY: 'auto',
          padding: 0,
        },
      }}
      destroyOnHidden
      footer={
        <div className={styles.modalFooter}>
          <Button onClick={onClose}>Cerrar</Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            Imprimir
          </Button>
        </div>
      }
    >
      {/* ════════════════════════════════════════════ */}
      {/* CONTENIDO IMPRIMIBLE (todo dentro de .printable) */}
      {/* ════════════════════════════════════════════ */}
      <div className={styles.printable}>
        {/* ── Header: Logo + Taller ────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {logo && (
              <img src={logo} alt="Logo del taller" className={styles.logo} />
            )}
            <div className={styles.tallerInfo}>
              <h1 className={styles.tallerName}>{title || 'Taller Mecánico'}</h1>
              {direccion && (
                <p className={styles.tallerDetail}>{direccion}</p>
              )}
              {ciudad && (
                <p className={styles.tallerDetail}>{ciudad}</p>
              )}
              {telefono && (
                <p className={styles.tallerDetail}>Tel: {telefono}</p>
              )}
              {email && (
                <p className={styles.tallerDetail}>Email: {email}</p>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            <h2 className={styles.docTitle}>ORDEN DE TRABAJO</h2>
            <p className={styles.docDate}>Fecha: {visitDate}</p>
          </div>
        </div>

        <Divider className={styles.printDivider} />

        {/* ── Datos del Cliente y Vehículo ──────────── */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Datos del Cliente y Vehículo</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Cliente:</span>
              <span className={styles.value}>{vehicle.ownerName}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Patente:</span>
              <span className={styles.value}>{vehicle.licensePlate.toUpperCase()}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Marca/Modelo:</span>
              <span className={styles.value}>{vehicle.brand} {vehicle.model}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Año:</span>
              <span className={styles.value}>{vehicle.year}</span>
            </div>
            {vehicle.color && (
              <div className={styles.infoItem}>
                <span className={styles.label}>Color:</span>
                <span className={styles.value}>{vehicle.color}</span>
              </div>
            )}
            <div className={styles.infoItem}>
              <span className={styles.label}>Fecha Ingreso:</span>
              <span className={styles.value}>{visitDate}</span>
            </div>
          </div>
        </div>

        <Divider className={styles.printDivider} />

        {/* ── Inspección ─────────────────────────────── */}
        {hasInspections && (
          <>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Inspección</h3>
              {mergedInspections.map((sector) => {
                const itemsWithStatus = sector.items.filter(i => i.status);
                if (itemsWithStatus.length === 0) return null;
                return (
                  <div key={sector.sector} className={styles.sectorBlock}>
                    <h4 className={styles.sectorName}>
                      {sectorNames[sector.sector as keyof typeof sectorNames] || sector.sector}
                    </h4>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Elemento</th>
                          <th style={{ width: '15%' }}>Estado</th>
                          <th style={{ width: '45%' }}>Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsWithStatus.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.name}</td>
                            <td>
                              <span className={item.status === 'revision' ? styles.statusRevision : styles.statusOk}>
                                {item.status === 'revision' ? 'R' : 'OK'}
                              </span>
                            </td>
                            <td>{item.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            <Divider className={styles.printDivider} />
          </>
        )}

        {/* ── Productos / Servicios ──────────────────── */}
        {(hasProducts || hasServices) && (
          <>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Productos / Servicios</h3>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Nombre</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Cant.</th>
                    <th style={{ width: '20%', textAlign: 'right' }}>P. Venta</th>
                    <th style={{ width: '25%', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.productosAsignados?.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.nombreProducto}</td>
                      <td style={{ textAlign: 'center' }}>{item.cantidad}</td>
                      <td style={{ textAlign: 'right' }}>${item.precioVenta.toLocaleString('es-AR')}</td>
                      <td style={{ textAlign: 'right' }}>${item.subtotal.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                  {visit.servicios?.map((serv, idx) => (
                    <tr key={`serv-${idx}`}>
                      <td>{serv.nombre}</td>
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ textAlign: 'right' }}>${serv.precio.toLocaleString('es-AR')}</td>
                      <td style={{ textAlign: 'right' }}>${serv.precio.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.totalRow}>
                <strong>TOTAL:</strong>
                <strong>${calcularTotal().toLocaleString('es-AR')}</strong>
              </div>
            </div>
            <Divider className={styles.printDivider} />
          </>
        )}

        {/* ── Pagos ──────────────────────────────────── */}
        {hasPayments && (
          <>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Pagos</h3>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Método</th>
                    <th style={{ width: '35%' }}>Referencia</th>
                    <th style={{ width: '35%', textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.pagos.map((pago) => (
                    <tr key={pago._id}>
                      <td>{pago.metodo}</td>
                      <td>{pago.referencia || '-'}</td>
                      <td style={{ textAlign: 'right' }}>${(pago.monto || 0).toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.totalRow}>
                <strong>Total Pagado:</strong>
                <strong>${calcularPagado().toLocaleString('es-AR')}</strong>
              </div>
            </div>
            <Divider className={styles.printDivider} />
          </>
        )}

        {/* ── Notas de Crédito ────────────────────────── */}
        {visit.notasCredito && visit.notasCredito.length > 0 && (
          <>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Notas de Crédito / Devoluciones</h3>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>Motivo</th>
                    <th style={{ width: '50%', textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.notasCredito.map((nota) => (
                    <tr key={nota._id}>
                      <td>{nota.motivo}</td>
                      <td style={{ textAlign: 'right' }}>-${(nota.monto || 0).toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.totalRow}>
                <strong>Total Devuelto:</strong>
                <strong style={{ color: '#cf1322' }}>
                  -${calcularDevuelto().toLocaleString('es-AR')}
                </strong>
              </div>
            </div>
            <Divider className={styles.printDivider} />
          </>
        )}

        {/* ── Saldo ────────────────────────────────────── */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Resumen</h3>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span>Total:</span>
              <span>${calcularTotal().toLocaleString('es-AR')}</span>
            </div>
            <div className={styles.summaryItem}>
              <span>Pagado:</span>
              <span>${calcularPagado().toLocaleString('es-AR')}</span>
            </div>
            <div className={styles.summaryItem}>
              <span>Devuelto:</span>
              <span>-${calcularDevuelto().toLocaleString('es-AR')}</span>
            </div>
            <div className={`${styles.summaryItem} ${styles.summaryTotal}`}>
              <span>Saldo:</span>
              <span style={{ color: calcularSaldo() > 0 ? '#cf1322' : '#52c41a' }}>
                ${calcularSaldo().toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

        <Divider className={styles.printDivider} />

        {/* ── Notas ──────────────────────────────────── */}
        {visit.notas && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Notas</h3>
            <p className={styles.notasText}>{visit.notas}</p>
          </div>
        )}

        <Divider className={styles.printDivider} />

        {/* ── Firmas ────────────────────────────────── */}
        <div className={styles.signatureSection}>
          <div className={styles.signatureBlock}>
            <div className={styles.signatureLine} />
            <p className={styles.signatureLabel}>Firma del Cliente</p>
            <p className={styles.signatureSub}>Acepto los trabajos realizados</p>
          </div>
          <div className={styles.signatureBlock}>
            <div className={styles.signatureLine} />
            <p className={styles.signatureLabel}>Firma del Taller</p>
            <p className={styles.signatureSub}>{title || 'Taller Mecánico'}</p>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────── */}
        <div className={styles.footer}>
          <p>
            Documento generado el {new Date().toLocaleDateString('es-ES', {
              day: '2-digit', month: 'long', year: 'numeric',
            })} - {title || 'Taller Mecánico'}
          </p>
          <p className={styles.footerSub}>
            Este documento es un comprobante de los trabajos realizados y productos asignados.
          </p>
        </div>
      </div>
    </Modal>
  );
}
