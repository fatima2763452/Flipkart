import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import api from '../../services/api';
import logo from '../../assets/logo.jpeg';

import autoTable from "jspdf-autotable";
const loadImageAsBase64 = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
};

const getImgDimensions = (src) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 2, height: 1 });
        img.src = src;
    });
};
// Helper for standard Indian currency formatting
const formatIndianCurrency = (n) => {
    const num = Number(n ?? 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper for profit/loss sign formatting (+/- at the back)
const formatProfitLoss = (n) => {
    const num = Number(n ?? 0);
    const sign = num >= 0 ? '+' : '-';
    const absVal = Math.abs(num);
    return `${sign}₹${absVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u00A0`;
};

// Helper to render ₹ symbol as a high-res image (PDF built-in fonts don't support ₹)
const createRupeeImage = (hexColor, fontSizePt) => {
    const scale = 8;
    const sizePx = fontSizePt * 1.33;
    const font = `bold ${Math.round(sizePx * scale)}px "Segoe UI", Arial, sans-serif`;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = font;
    const metrics = ctx.measureText('₹');
    const w = Math.ceil(metrics.width) + 2;
    const h = Math.ceil(sizePx * scale * 1.1);
    canvas.width = w;
    canvas.height = h;
    ctx.font = font;
    ctx.fillStyle = hexColor;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('₹', 1, h * 0.75);
    return { dataUrl: canvas.toDataURL('image/png'), w: w / scale, h: h / scale };
};
const rgbToHex = (rgb) => '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');

// Helper to format raw number for PDF table (without currency symbol)
const formatPDFNumber = (n) => {
    const num = Number(n ?? 0);
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper for PDF specific profit/loss formatting
const formatPDFProfitLoss = (n) => {
    const num = Number(n ?? 0);
    const sign = num >= 0 ? '+' : '-';
    const absVal = Math.abs(num);
    return `${sign}${absVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper to format date to DD MMM (e.g. 30 JUN)
const formatDDMMM = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${day} ${months[date.getMonth()]}`;
};

export default function Invoice() {
    const navigate = useNavigate();
    const { id: customerId } = useParams();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [margin, setMargin] = useState(''); // Margin Input State
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [invoiceData, setInvoiceData] = useState([]);
    const [invoiceId, setInvoiceId] = useState('');
    const [summary, setSummary] = useState({ totalTurnover: 0, totalProfit: 0, totalLoss: 0, totalBrokerage: 0, netPnl: 0 });
    const [fetchStatus, setFetchStatus] = useState(''); // For UI debug
    const [filterStats, setFilterStats] = useState({ total: 0, matched: 0, range: '' });
    const [clientName, setClientName] = useState('');
    const [clientCode, setClientCode] = useState('');
    const [isClosedAccount, setIsClosedAccount] = useState(false);

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const userInfoStr = localStorage.getItem('userInfo');
                if (!userInfoStr) return;
                const userInfo = JSON.parse(userInfoStr);
                const ownerId = userInfo?._id;
                if (!ownerId) return;

                const res = await api.get(`/customers?ownerId=${ownerId}`);
                const customer = res.data.find(c => c._id === customerId);
                if (customer) {
                    setClientName(customer.name);
                    setClientCode(customer.customerId);
                }
            } catch (err) {
                console.error("Failed to fetch customer", err);
            }
        };
        fetchCustomer();
    }, [customerId]);

    // Fetch Orders (Exit records)
    const fetchOrders = async () => {
        setLoading(true);
        setFetchStatus('Fetching...');
        try {
            const res = await api.get(`/trades/weekly/${customerId}`);
            const count = res.data?.length || 0;
            setFetchStatus(`Loaded ${count} closed orders from server.`);
            setOrders(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('[Invoice] Fetch Failed:', err);
            setFetchStatus(`Fetch Failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Set default dates (start of month to today)
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);

        fetchOrders();
    }, [customerId]);

    const generateInvoice = () => {
        if (!startDate || !endDate) return;

        const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number);

        const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

        const filtered = orders.filter(o => {
            const fallbackDate = o.date || o.createdAt;
            if (!fallbackDate) return false;
            const date = new Date(fallbackDate);
            return date >= start && date <= end;
        });

        setFilterStats({
            total: orders.length,
            matched: filtered.length,
            range: `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`
        });

        // Generate Invoice ID if not already set
        if (!invoiceId) {
            const rand4 = Math.floor(1000 + Math.random() * 9000);
            setInvoiceId(`R#######${rand4}`);
        }

        // Process Data for Invoice
        let totalTurnover = 0;
        let totalBrokerageAccumulated = 0;
        let totalProfit = 0;
        let totalLoss = 0;

        const processed = filtered.map(order => {
            const qty = parseFloat(order.quantity) || 0;
            const entryPrice = parseFloat(order.price) || 0;
            const exitPrice = parseFloat(order.ltp) || 0;

            const entryValue = entryPrice * qty;
            const exitValue = exitPrice * qty;
            const netPnl = parseFloat(order.realizedPnl) || 0;
            const finalBrokerage = parseFloat(order.brokerageFee) || 0;

            totalTurnover += (entryValue + exitValue);
            totalBrokerageAccumulated += finalBrokerage;

            if (netPnl >= 0) {
                totalProfit += netPnl;
            } else {
                totalLoss += Math.abs(netPnl);
            }

            return {
                ...order,
                qty,
                entryPrice,
                exitPrice,
                netPnl,
                totalBrokerage: finalBrokerage,
                dateStr: new Date(order.date || order.createdAt).toLocaleDateString()
            };
        });

        setInvoiceData(processed);
        setSummary({
            totalTurnover,
            totalProfit,
            totalLoss,
            totalBrokerage: totalBrokerageAccumulated,
            netPnl: totalProfit - totalLoss
        });
        setGenerated(true);
    };

    // --- PDF DOWNLOAD HANDLER ---
    const handleDownloadPDF = async () => {
        try {
            setLoading(true);

            const pdf = new jsPDF('p', 'pt', 'a4');

            const activeFont = 'helvetica';
            pdf.setFont(activeFont, 'normal');

            const pageW = pdf.internal.pageSize.getWidth();   // 595.28
            const pageH = pdf.internal.pageSize.getHeight();  // 841.89
            const marginSize = 40; // matching standard padding
            let cursorY = marginSize;

            const darkText = [15, 23, 42];      // Slate 900 (#0f172a)
            const mutedText = [100, 116, 139];  // Slate 500 (#64748b)
            const greenColor = [0, 176, 80];    // Green (#00B050)
            const redColor = [239, 68, 68];     // Red (#ef4444)
            const contentW = pageW - 2 * marginSize;

            // Load logo as base64 and get image size
            const [logoBase64, dims] = await Promise.all([
                loadImageAsBase64(logo),
                getImgDimensions(logo)
            ]);

            // Header Elements (Logo on the left)
            if (logoBase64) {
                const logoH = 65; // height in pt
                const logoW = (dims.width / dims.height) * logoH;
                pdf.addImage(logoBase64, 'JPEG', marginSize, cursorY, logoW, logoH);
            }

            // Right elements aligned to the right (Invoice info)
            const rightX = pageW - marginSize;
            pdf.setTextColor(...darkText);

            // Invoice No
            pdf.setFont(activeFont, 'bold');
            pdf.setFontSize(12);
            pdf.text(`Invoice No. ${invoiceId}`, rightX, cursorY + 15, { align: 'right' });

            // Client Name
            pdf.setFont(activeFont, 'bold');
            pdf.setFontSize(12);
            pdf.text(clientName || '', rightX, cursorY + 32, { align: 'right' });

            // Client Code
            pdf.setFont(activeFont, 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(...darkText);
            pdf.text(`${clientCode || ''}`, rightX, cursorY + 47, { align: 'right' });

            // Date
            pdf.setFont(activeFont, 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(...darkText);
            pdf.text(`${new Date().toLocaleDateString('en-GB')}`, rightX, cursorY + 62, { align: 'right' });

            cursorY += 75;

            // Separator Line
            pdf.setDrawColor(226, 232, 240); // Slate 200
            pdf.setLineWidth(1);
            pdf.line(marginSize, cursorY, pageW - marginSize, cursorY);

            cursorY += 25; // Space before table

            // Map columns and rows for autoTable
            const tableColumns = [
                { header: 'No.', dataKey: 'idx' },
                { header: 'STOCK', dataKey: 'stock' },
                { header: 'TYPE', dataKey: 'type' },
                { header: 'AVG. BUY PRICE', dataKey: 'buyPrice' },
                { header: 'QTY', dataKey: 'qty' },
                { header: 'EXIT PRICE', dataKey: 'exitPrice' },
                { header: 'BROKERAGE', dataKey: 'brokerage' },
                { header: 'P/L', dataKey: 'pl' },
            ];

            const tableRows = invoiceData.map((item, idx) => {
                const symbol = item.symbol?.toUpperCase();
                const dateStr = formatDDMMM(item.date || item.createdAt);
                return {
                    idx: String(idx + 1),
                    stock: `${symbol}\n${dateStr}`,
                    type: item.action?.toUpperCase() || 'SELL',
                    buyPrice: formatPDFNumber(item.entryPrice),
                    qty: String(item.qty),
                    exitPrice: formatPDFNumber(item.exitPrice),
                    brokerage: formatPDFNumber(item.totalBrokerage),
                    pl: formatPDFProfitLoss(item.netPnl),
                    _netPnl: item.netPnl,
                    _type: item.action?.toUpperCase() || 'SELL'
                };
            });

            const tableResult = autoTable(pdf, {
                startY: cursorY,
                columns: tableColumns,
                body: tableRows,
                margin: { left: marginSize, right: marginSize },
                tableWidth: 'auto',
                theme: 'grid',
                styles: { font: activeFont },
                headStyles: {
                    fillColor: [15, 23, 42],      // Slate 900 (#0f172a)
                    textColor: [255, 255, 255],   // White
                    fontStyle: 'bold',
                    fontSize: 8.5,
                    halign: 'center',
                    valign: 'middle',
                    lineWidth: 0.5,
                    lineColor: [226, 232, 240]    // Slate 200
                },
                bodyStyles: {
                    fontSize: 8,
                    fontStyle: 'bold',
                    textColor: [15, 23, 42],      // Slate 900
                    valign: 'middle',
                    lineWidth: 0.5,
                    lineColor: [241, 245, 249]    // Slate 100
                },
                columnStyles: {
                    idx: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
                    stock: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
                    type: { cellWidth: 45, halign: 'center' , fontStyle: 'bold'},
                    buyPrice: { cellWidth: 80, halign: 'right' , fontStyle: 'bold'},
                    qty: { cellWidth: 40, halign: 'center' , fontStyle: 'bold'},
                    exitPrice: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
                    brokerage: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
                    pl: { cellWidth: 90, halign: 'right', fontStyle: 'bold' }
                },
                didParseCell: (data) => {
                    if (data.section === 'body') {
                        if (data.column.dataKey === 'pl') {
                            const rowVal = tableRows[data.row.index]?._netPnl;
                            data.cell.styles.textColor = rowVal >= 0 ? greenColor : redColor;
                            data.cell.styles.fontStyle = 'bold';
                        }
                        if (data.column.dataKey === 'type') {
                            const typeVal = tableRows[data.row.index]?._type;
                            data.cell.styles.textColor = typeVal === 'BUY' ? [37, 99, 235] : [220, 38, 38];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                },
                rowPageBreak: 'avoid'
            });

            cursorY = (tableResult?.finalY ?? pdf.lastAutoTable?.finalY ?? cursorY) + 30;

            // Space verification helper
            const ensureSpace = (neededHeight) => {
                if (cursorY + neededHeight > pageH - 40) {
                    pdf.addPage();
                    cursorY = marginSize;
                }
            };

            // Summary Footer section
            ensureSpace(120);

            // Pre-render ₹ images for each color/size
            const rupeeSmGreen = createRupeeImage(rgbToHex(greenColor), 6);
            const rupeeSmRed = createRupeeImage(rgbToHex(redColor), 6);
            const rupeeSmDark = createRupeeImage(rgbToHex(darkText), 6);
            const rupeeLgDark = createRupeeImage(rgbToHex(darkText), 8);

            // Left: Margin
            if (margin) {
                pdf.setFillColor(248, 250, 252); // Slate 50
                pdf.setDrawColor(241, 245, 249); // Slate 100
                pdf.roundedRect(marginSize, cursorY, 160, 45, 6, 6, 'FD');
                
                pdf.setFont(activeFont, 'bold');
                pdf.setFontSize(8);
                pdf.setTextColor(...mutedText);
                pdf.text('MONEY MARGIN USED', marginSize + 10, cursorY + 16);

                pdf.setFontSize(11);
                pdf.setTextColor(...darkText);
                const marginVal = formatPDFNumber(margin);
                const mX = marginSize + 10;
                const mY = cursorY + 34;
                pdf.addImage(rupeeLgDark.dataUrl, 'PNG', mX, mY - rupeeLgDark.h * 0.72, rupeeLgDark.w, rupeeLgDark.h);
                pdf.text(marginVal, mX + rupeeLgDark.w + 1, mY);
            }

            // Right: Summary Card
            const cardW = 200;
            const cardX = pageW - marginSize - cardW;
            
            pdf.setFillColor(248, 250, 252); // Slate 50
            pdf.setDrawColor(226, 232, 240); // Slate 200
            pdf.roundedRect(cardX, cursorY, cardW, 105, 8, 8, 'FD');

            const rightEdge = cardX + cardW - 12;

            let itemY = cursorY + 18;
            pdf.setFontSize(8);
            pdf.setTextColor(...mutedText);
            pdf.setFont(activeFont, 'bold');
            pdf.text('TOTAL PROFIT', cardX + 12, itemY);
            pdf.setTextColor(...greenColor);
            const profitVal = formatPDFNumber(summary.totalProfit);
            const profitW = pdf.getTextWidth(profitVal);
            pdf.addImage(rupeeSmGreen.dataUrl, 'PNG', rightEdge - profitW - rupeeSmGreen.w - 2, itemY - rupeeSmGreen.h * 0.72, rupeeSmGreen.w, rupeeSmGreen.h);
            pdf.text(profitVal, rightEdge, itemY, { align: 'right' });

            itemY += 16;
            pdf.setTextColor(...mutedText);
            pdf.text('TOTAL LOSS', cardX + 12, itemY);
            pdf.setTextColor(...redColor);
            const lossVal = formatPDFNumber(summary.totalLoss);
            const lossW = pdf.getTextWidth(lossVal);
            pdf.addImage(rupeeSmRed.dataUrl, 'PNG', rightEdge - lossW - rupeeSmRed.w - 2, itemY - rupeeSmRed.h * 0.72, rupeeSmRed.w, rupeeSmRed.h);
            pdf.text(lossVal, rightEdge, itemY, { align: 'right' });

            itemY += 16;
            pdf.setTextColor(...mutedText);
            pdf.text('TOTAL BROKERAGE', cardX + 12, itemY);
            pdf.setTextColor(...darkText);
            const brokVal = formatPDFNumber(summary.totalBrokerage);
            const brokW = pdf.getTextWidth(brokVal);
            pdf.addImage(rupeeSmDark.dataUrl, 'PNG', rightEdge - brokW - rupeeSmDark.w - 2, itemY - rupeeSmDark.h * 0.72, rupeeSmDark.w, rupeeSmDark.h);
            pdf.text(brokVal, rightEdge, itemY, { align: 'right' });

            itemY += 12;
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.5);
            pdf.line(cardX + 12, itemY, cardX + cardW - 12, itemY);

            itemY += 18;
            pdf.setFontSize(9);
            const isNetProfit = summary.netPnl >= 0;
            const netColor = isNetProfit ? greenColor : redColor;
            pdf.setTextColor(...netColor);
            pdf.text(isNetProfit ? 'NET PROFIT' : 'NET LOSS', cardX + 12, itemY);
            const netSign = isNetProfit ? '+' : '-';
            const netAbsVal = Math.abs(summary.netPnl);
            const netValStr = netAbsVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            pdf.setFontSize(11);
            const netValW = pdf.getTextWidth(netValStr);
            const rupeeLgNet = createRupeeImage(rgbToHex(netColor), 8);
            const netSignW = pdf.getTextWidth(netSign);
            const totalNetW = netSignW + 2 + rupeeLgNet.w + 1 + netValW;
            const netStartX = rightEdge - totalNetW;
            pdf.text(netSign, netStartX, itemY);
            pdf.addImage(rupeeLgNet.dataUrl, 'PNG', netStartX + netSignW + 2, itemY - rupeeLgNet.h * 0.72, rupeeLgNet.w, rupeeLgNet.h);
            pdf.text(netValStr, rightEdge, itemY, { align: 'right' });

            cursorY += 120;

            // Note & Footer
            ensureSpace(80);
            pdf.setDrawColor(241, 245, 249);
            pdf.setLineWidth(1);
            pdf.line(marginSize, cursorY, pageW - marginSize, cursorY);
            
            cursorY += 20;

            pdf.setFont(activeFont, 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(...redColor);
            const noteText = isClosedAccount 
                ? 'Note: All your accounts, transaction ledger, and outstanding balances have been fully settled and cleared. Your account has been closed with Radhe Brokerage.'
                : 'Note: All the trades you have taken are listed here. Holdings are not included.';
            const splitNote = pdf.splitTextToSize(noteText, contentW);
            pdf.text(splitNote, marginSize, cursorY);

            cursorY += splitNote.length * 12 + 10;

            pdf.setFont(activeFont, 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(148, 163, 184); // Slate 400
            pdf.text('RADHE BROCKRAGE PVT. LTD.', pageW / 2, cursorY, { align: 'center' });

            // File Name Safe Formatting
            const safeClientName = (clientName || 'Invoice').replace(/[^a-zA-Z0-9]/g, '_');
            const d = new Date();
            const formattedDate = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear().toString().slice(-2)}`;

            pdf.save(`${safeClientName}_${formattedDate}.pdf`);

        } catch (error) {
            console.error('PDF Error:', error);
            alert(`PDF generation failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // If not generated, show form
    if (!generated) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 flex flex-col items-center pt-20">
                <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full dark:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold dark:text-white">Generate Tax Invoice</h1>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Margin Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Margin Used ( ₹ )</label>
                            <input
                                type="number"
                                value={margin}
                                onChange={(e) => setMargin(e.target.value)}
                                placeholder="Enter Margin Amount"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        {/* Closed Account Note Checkbox */}
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="closed-account-checkbox"
                                checked={isClosedAccount}
                                onChange={(e) => setIsClosedAccount(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="closed-account-checkbox" className="text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                Close account statement (settlement note)
                            </label>
                        </div>

                        <button
                            onClick={generateInvoice}
                            disabled={loading}
                            className="w-full bg-[#00B050] hover:bg-[#009040] text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4"
                        >
                            {loading ? 'Loading Data...' : 'Generate Invoice'}
                        </button>

                       
                    </div>
                </div>
            </div>
        );
    }

    // Invoice View
    return (
        <div className="min-h-screen bg-white text-black p-8 print:p-0">
            {/* Print / Download Controls - Hidden in Print */}
            <div className="max-w-5xl mx-auto mb-8 flex justify-between print:hidden">
                <button onClick={() => setGenerated(false)} className="flex items-center gap-2 text-gray-600 hover:text-black">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex gap-2">
                    {/* Manual PDF Download Button */}
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-[#00B050] text-white px-4 py-2 rounded-lg hover:bg-[#009040]">
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                </div>
            </div>

            {/* Invoice Document - ID added for html2canvas */}
            <div id="invoice-content" className="max-w-4xl mx-auto border border-[#e5e7eb] p-8 bg-white shadow-sm print:shadow-none print:border-none">

                {/* Header */}
                <div className="flex justify-between items-center pb-6 mb-6">
                    <div>
                        <img src={logo} alt="Logo" style={{ height: '170px', maxWidth: '300px', objectFit: 'contain' }} />
                    </div>

                    <div className="text-right mt-2">
                        <h2 className="text-lg font-bold text-slate-900">Invoice No. {invoiceId}</h2>
                        <div className="mt-2.5 space-y-1">
                            <p className="text-lg font-bold text-slate-900">{clientName}</p>
                            <p className="text-sm font-bold text-slate-900">{clientCode}</p>
                            <p className="text-sm font-semibold text-slate-900">{new Date().toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>
                </div>

                {/* Separator */}
                <div className="border-t border-slate-200 mb-6"></div>

                {/* Spacer for spacing before table */}
                <div style={{ height: '24px', width: '100%' }}></div>

                {/* Table */}
                <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }} className="bg-[#0f172a] text-white font-bold uppercase text-[11px] tracking-wider">
                            <tr>
                                <th className="px-4 py-3.5 text-center w-12">No.</th>
                                <th className="px-4 py-3.5 text-left">STOCK</th>
                                <th className="px-4 py-3.5 text-center w-20">TYPE</th>
                                <th className="px-4 py-3.5 text-right">AVG. BUY PRICE</th>
                                <th className="px-4 py-3.5 text-center w-24">QTY</th>
                                <th className="px-4 py-3.5 text-right">EXIT PRICE</th>
                                <th className="px-4 py-3.5 text-right">BROKERAGE</th>
                                <th className="px-4 py-3.5 text-right">P/L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoiceData.map((item, idx) => (
                                <tr key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }} className="even:bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-4 text-center text-slate-400 font-semibold text-xs">{idx + 1}</td>
                                    <td className="px-4 py-4 font-bold text-slate-900 text-xs">
                                        <div className="flex flex-col">
                                            <span>{item.symbol?.toUpperCase()}</span>
                                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">{formatDDMMM(item.date || item.createdAt)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                                            item.action?.toUpperCase() === 'BUY' 
                                                ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                                : 'bg-red-50 text-red-600 border border-red-100'
                                        }`}>
                                            {item.action?.toUpperCase() || 'SELL'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right text-slate-700 font-medium">
                                        {formatIndianCurrency(item.entryPrice)}
                                    </td>
                                    <td className="px-4 py-4 text-center text-slate-700 font-medium">
                                        {item.qty}
                                    </td>
                                    <td className="px-4 py-4 text-right text-slate-700 font-medium">
                                        {formatIndianCurrency(item.exitPrice)}
                                    </td>
                                    <td className="px-4 py-4 text-right text-slate-700 font-medium">
                                        {formatIndianCurrency(item.totalBrokerage)}
                                    </td>
                                    <td className={`px-4 py-4 text-right font-extrabold whitespace-nowrap ${item.netPnl >= 0 ? 'text-[#00B050]' : 'text-[#ef4444]'}`}>
                                        {formatProfitLoss(item.netPnl)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Spacer for Summary Footer */}
                <div style={{ height: '40px', width: '100%' }}></div>

                {/* Summary Footer */}
                <div className="flex justify-between items-start pt-6 border-t border-slate-100">
                    {/* Display Margin if entered */}
                    <div>
                        {margin && (
                            <div className="text-xs bg-slate-50 border border-slate-100 p-3 rounded-lg text-slate-600">
                                <span className="font-semibold block text-slate-500 mb-1">MONEY MARGIN USED</span>
                                <span className="text-sm font-bold text-slate-800">{formatIndianCurrency(margin)}</span>
                            </div>
                        )}
                    </div>

                    {/* Summary Card */}
                    <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }} className="summary-card w-72 bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-2.5 shadow-sm">
                        <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
                            <span>Total Profit</span>
                            <span className="text-[#00B050] font-bold">{formatIndianCurrency(summary.totalProfit)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
                            <span>Total Loss</span>
                            <span className="text-[#ef4444] font-bold">{formatIndianCurrency(summary.totalLoss)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase">
                            <span>Total Brokerage</span>
                            <span className="text-slate-700 font-bold">{formatIndianCurrency(summary.totalBrokerage)}</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200/80 my-2"></div>
                        <div className="flex justify-between text-sm font-bold uppercase">
                            <span className={summary.netPnl >= 0 ? 'text-[#00B050]' : 'text-[#ef4444]'}>
                                {summary.netPnl >= 0 ? 'Net Profit' : 'Net Loss'}
                            </span>
                            <span className={`font-extrabold text-base ${summary.netPnl >= 0 ? 'text-[#00B050]' : 'text-[#ef4444]'}`}>
                                {formatProfitLoss(summary.netPnl)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Note and Footer */}
                <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }} className="note-container mt-10 pt-6 border-t border-slate-100">
                   
                        
                        <p className="text-sm text-red-500 font-bold leading-relaxed">
                            {isClosedAccount 
                                ? "Note: All your accounts, transaction ledger, and outstanding balances have been fully settled and cleared. Your account has been closed with Radhe Brokerage."
                                : "Note: All the trades you have taken are listed here. Holdings are not included."
                            }
                        </p>
                   
                    
                    <div className="text-center text-[10px] text-slate-400 mt-2 font-bold tracking-widest uppercase">
                        RADHE BROCKRAGE PVT. LTD.
                    </div>
                </div>

            </div>

            {/* Post-Generation Debug Info (small) */}
            <div className="max-w-4xl mx-auto mt-4 text-[10px] text-gray-400 text-center opacity-70 bg-gray-50 p-2 rounded border border-gray-100">
                <div>API Status: {fetchStatus} | Client ID: {customerId}</div>
                <div>Filter Info: Total {filterStats.total} | Range: {filterStats.range} | Matched: {filterStats.matched}</div>
                {orders.length > 0 && filterStats.matched === 0 && (
                    <div className="text-red-400 font-bold mt-1">
                        TIP: Orders found on server, but skipped by Date Filter. Check dates carefully!
                    </div>
                )}
            </div>
        </div>
    );
}
