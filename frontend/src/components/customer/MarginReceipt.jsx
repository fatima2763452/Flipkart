import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import api from '../../services/api';
import logo from '../../assets/logo.jpeg';

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

let logoAssetCache = null;

const getLogoAsset = async (src) => {
    if (logoAssetCache) return logoAssetCache;
    const [base64, dims] = await Promise.all([
        loadImageAsBase64(src),
        getImgDimensions(src)
    ]);
    if (base64) {
        logoAssetCache = { base64, dims };
    }
    return { base64, dims };
};

// Helper for Indian currency formatting
const formatIndianCurrency = (n) => {
    const num = Number(n ?? 0);
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper to convert number to Indian format words
const numberToWords = (num) => {
    if (num === 0 || isNaN(num)) return '';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const formatLessThanThousand = (n) => {
        let temp = '';
        if (n >= 100) {
            temp += a[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            temp += b[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0) {
            temp += a[n] + ' ';
        }
        return temp.trim();
    };

    let result = '';
    let val = Math.floor(num);
    let crore = Math.floor(val / 10000000);
    val %= 10000000;
    let lakh = Math.floor(val / 100000);
    val %= 100000;
    let thousand = Math.floor(val / 1000);
    val %= 1000;
    
    if (crore > 0) {
        result += formatLessThanThousand(crore) + ' Crore ';
    }
    if (lakh > 0) {
        result += formatLessThanThousand(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
        result += formatLessThanThousand(thousand) + ' Thousand ';
    }
    if (val > 0) {
        result += formatLessThanThousand(val) + ' ';
    }
    return result.trim() + ' Only';
};

export default function MarginReceipt() {
    const navigate = useNavigate();
    const { id: customerId } = useParams();
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);

    // Form inputs
    const [receiptNo, setReceiptNo] = useState('');
    const [receiptDate, setReceiptDate] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientCode, setClientCode] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [stockName, setStockName] = useState('');
    const [exchange, setExchange] = useState('Future');
    const [quantity, setQuantity] = useState('');
    const [marginAmount, setMarginAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('UPI');
    const [purpose, setPurpose] = useState('Margin amount received from the client for holding the trade. This margin will remain blocked until the trade is exited.');
    const [amountInWords, setAmountInWords] = useState('');

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

        // Prefill default Receipt No and Date
        const year = new Date().getFullYear();
        const randNum = Math.floor(1000 + Math.random() * 9000);
        setReceiptNo(`MR-${year}-${randNum}`);
        setReceiptDate(new Date().toISOString().split('T')[0]);

        // Prefill asset caches
        getLogoAsset(logo);
    }, [customerId]);

    // Update Amount in Words as Margin Amount changes
    useEffect(() => {
        const amt = parseFloat(marginAmount);
        if (!isNaN(amt)) {
            setAmountInWords(numberToWords(amt));
        } else {
            setAmountInWords('');
        }
    }, [marginAmount]);

    const handleGenerate = () => {
        if (!clientName || !clientCode || !marginAmount) {
            alert('Please fill out Client Name, ID, and Margin Amount.');
            return;
        }
        setGenerated(true);
    };

    const handleDownloadPDF = async () => {
        try {
            setLoading(true);

            const pdf = new jsPDF('p', 'pt', 'a4');
            const activeFont = 'helvetica';
            pdf.setFont(activeFont, 'normal');

            const pageW = pdf.internal.pageSize.getWidth();   // 595.28
            const pageH = pdf.internal.pageSize.getHeight();  // 841.89

            // Load assets
            const { base64: logoBase64, dims: logoDims } = await getLogoAsset(logo);

            // Draw outer border (dark navy blue)
            pdf.setDrawColor(0, 8, 57);
            pdf.setLineWidth(1.5);
            pdf.rect(20, 20, pageW - 40, pageH - 40, 'D');

            let cursorY = 40;

            // Logo (Left)
            if (logoBase64) {
                const logoH = 70; 
                const logoW = (logoDims.width / logoDims.height) * logoH;
                pdf.addImage(logoBase64, 'JPEG', 40, cursorY, logoW, logoH);
            }

            cursorY += 75;

            // Centered Margin Receipt Capsule
            const capsuleW = 160;
            const capsuleH = 22;
            const capsuleX = (pageW - capsuleW) / 2;
            pdf.setFillColor(0, 8, 57);
            pdf.roundedRect(capsuleX, cursorY, capsuleW, capsuleH, 5, 5, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFont(activeFont, 'bold');
            pdf.setFontSize(10);
            pdf.text("MARGIN RECEIPT", pageW / 2, cursorY + 14, { align: 'center' });

            cursorY += 40;

            // Receipt Meta (No and Date)
            pdf.setFontSize(8.5);
            pdf.setTextColor(15, 23, 42);
            pdf.setFont(activeFont, 'bold');
            pdf.text(`Receipt No. :  ${receiptNo}`, 40, cursorY);
            
            const dateObj = new Date(receiptDate);
            const formattedDate = isNaN(dateObj.getTime()) 
                ? receiptDate 
                : `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
            pdf.text(`Date :  ${formattedDate}`, pageW - 40, cursorY, { align: 'right' });

            cursorY += 8;

            // Separator Line
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(1);
            pdf.line(40, cursorY, pageW - 40, cursorY);

            cursorY += 20;

            // CLIENT DETAILS Section
            pdf.setFillColor(0, 8, 57);
            pdf.roundedRect(40, cursorY, 95, 18, 3, 3, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont(activeFont, 'bold');
            pdf.text("CLIENT DETAILS", 45, cursorY + 12);

            const clientCardY = cursorY + 24;
            const clientCardH = 50;
            pdf.setDrawColor(226, 232, 240);
            pdf.roundedRect(40, clientCardY, pageW - 80, clientCardH, 5, 5, 'D');

            pdf.setTextColor(100, 116, 139);
            pdf.setFont(activeFont, 'normal');
            pdf.text("Client Name", 55, clientCardY + 16);
            pdf.text("Client ID", 55, clientCardY + 30);
            pdf.text("Mobile No.", 55, clientCardY + 44);

            pdf.setTextColor(15, 23, 42);
            pdf.text(":", 120, clientCardY + 16);
            pdf.text(":", 120, clientCardY + 30);
            pdf.text(":", 120, clientCardY + 44);

            pdf.setFont(activeFont, 'bold');
            pdf.text(clientName, 130, clientCardY + 16);
            pdf.text(clientCode, 130, clientCardY + 30);
            pdf.setFont(activeFont, 'normal');
            const displayMobile = mobileNumber ? `XXXXXX${mobileNumber}` : 'N/A';
            pdf.text(displayMobile, 130, clientCardY + 44);

            cursorY = clientCardY + clientCardH + 15;

            // MARGIN DETAILS Section
            pdf.setFillColor(0, 8, 57);
            pdf.roundedRect(40, cursorY, 100, 18, 3, 3, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont(activeFont, 'bold');
            pdf.text("MARGIN DETAILS", 45, cursorY + 12);

            const gridY = cursorY + 24;
            const gridRowH = 20;
            const gridH = gridRowH * 5;
            pdf.setDrawColor(226, 232, 240);
            pdf.rect(40, gridY, pageW - 80, gridH, 'D');

            // Draw horizontal lines in table
            for (let i = 1; i < 5; i++) {
                pdf.line(40, gridY + i * gridRowH, pageW - 40, gridY + i * gridRowH);
            }
            // Draw vertical column divider
            pdf.line(160, gridY, 160, gridY + gridH);

            pdf.setTextColor(100, 116, 139);
            pdf.setFont(activeFont, 'normal');
            pdf.text("Stock Name", 50, gridY + 13);
            pdf.text("Segment", 50, gridY + 33);
            pdf.text("Quantity", 50, gridY + 53);
            pdf.text("Margin Amount Received", 50, gridY + 73);
            pdf.text("Payment Mode", 50, gridY + 93);

            pdf.setTextColor(15, 23, 42);
            pdf.text(":", 150, gridY + 13);
            pdf.text(":", 150, gridY + 33);
            pdf.text(":", 150, gridY + 53);
            pdf.text(":", 150, gridY + 73);
            pdf.text(":", 150, gridY + 93);

            pdf.setFont(activeFont, 'bold');
            pdf.text(stockName || 'N/A', 170, gridY + 13);
            pdf.text(exchange || 'N/A', 170, gridY + 33);
            pdf.text(quantity ? String(quantity) : 'N/A', 170, gridY + 53);
            pdf.text(`Rs. ${formatIndianCurrency(marginAmount)}`, 170, gridY + 73);
            pdf.setFont(activeFont, 'normal');
            pdf.text(paymentMode, 170, gridY + 93);

            cursorY = gridY + gridH + 15;

            // PURPOSE Section
            pdf.setFillColor(0, 8, 57);
            pdf.roundedRect(40, cursorY, 70, 18, 3, 3, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont(activeFont, 'bold');
            pdf.text("PURPOSE", 45, cursorY + 12);

            const purposeCardY = cursorY + 24;
            const purposeCardH = 40;
            pdf.setDrawColor(226, 232, 240);
            pdf.roundedRect(40, purposeCardY, pageW - 80, purposeCardH, 5, 5, 'D');

            pdf.setTextColor(15, 23, 42);
            pdf.setFont(activeFont, 'normal');
            pdf.setFontSize(7.5);
            const purposeLines = pdf.splitTextToSize(purpose, pageW - 100);
            pdf.text(purposeLines, 50, purposeCardY + 15);

            cursorY = purposeCardY + purposeCardH + 15;

            // Amount in Words
            pdf.setTextColor(100, 116, 139);
            pdf.setFontSize(8);
            pdf.setFont(activeFont, 'bold');
            pdf.text("Amount in Words  : ", 40, cursorY + 10);
            
            pdf.setTextColor(15, 23, 42);
            pdf.setFont(activeFont, 'bolditalic');
            pdf.text(amountInWords || 'N/A', 125, cursorY + 10);
            pdf.setDrawColor(226, 232, 240);
            pdf.line(125, cursorY + 14, pageW - 40, cursorY + 14);

            cursorY += 35;

            // Bottom Section (Dashed ₹ Box, Received By & Stamp, Authorized Signatory)
            const footerY = cursorY + 10;

            // Currency text (Left)
            pdf.setFont(activeFont, 'bold');
            pdf.setFontSize(13);
            pdf.text(`Rs. ${formatIndianCurrency(marginAmount)}`, 40, footerY + 26);

            // Received By (Center)
            // const centerColX = 280;
            // pdf.setFontSize(8);
            // pdf.setFont(activeFont, 'bold');
            // pdf.text("Received By", centerColX, footerY + 12, { align: 'center' });
            // pdf.setFontSize(7.5);
            // pdf.text("RADHE BROKERAGE PVT. LTD.", centerColX, footerY + 22, { align: 'center' });

            // // Authorized Signatory (Right)
            // const rightColX = pageW - 40 - 60;
            // pdf.setFontSize(8);
            // pdf.setFont(activeFont, 'bold');
            // pdf.text("Authorized Signatory", rightColX + 30, footerY + 70, { align: 'center' });
            // pdf.setDrawColor(200, 200, 200);
            // pdf.line(rightColX - 30, footerY + 54, rightColX + 90, footerY + 54);

            // Bottom Disclaimer Note
            const noteY = 740;
            pdf.setFillColor(248, 250, 252);
            pdf.setDrawColor(226, 232, 240);
            pdf.roundedRect(40, noteY, pageW - 80, 30, 4, 4, 'FD');

            pdf.setFont(activeFont, 'normal');
            pdf.setFontSize(6.5);
            pdf.setTextColor(100, 116, 139);
            const disclaimerNote = "Note: margin has received, it will be block until trade exit, after trade exit it will be free";
            const noteLines = pdf.splitTextToSize(disclaimerNote, pageW - 100);
            pdf.text(noteLines, 50, noteY + 11);

            // Bottom Right Corner Geometric Accent
            pdf.setFillColor(0, 8, 57);
            pdf.triangle(pageW - 20, pageH - 50, pageW - 50, pageH - 20, pageW - 20, pageH - 20, 'F');
            pdf.setFillColor(37, 99, 235);
            pdf.triangle(pageW - 20, pageH - 40, pageW - 40, pageH - 20, pageW - 20, pageH - 20, 'F');

            // Save PDF
            const safeClientName = (clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
            pdf.save(`${safeClientName}_Margin_Receipt_${receiptNo}.pdf`);

        } catch (error) {
            console.error('PDF Error:', error);
            alert(`PDF generation failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!generated) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 flex flex-col items-center pt-20">
                <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full dark:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold dark:text-white">Create Margin Receipt</h1>
                    </div>

                    <div className="space-y-4">
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Client Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Receipt Date</label>
                                    <input
                                        type="date"
                                        value={receiptDate}
                                        onChange={(e) => setReceiptDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Client Name</label>
                                    <input
                                        type="text"
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Client ID</label>
                                        <input
                                            type="text"
                                            value={clientCode}
                                            onChange={(e) => setClientCode(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Mobile Number (Last 4 Digits)</label>
                                        <input
                                            type="text"
                                            maxLength={4}
                                            value={mobileNumber}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 4) {
                                                    setMobileNumber(val);
                                                }
                                            }}
                                            placeholder="e.g. 8888"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Margin Details</h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Stock Name</label>
                                        <input
                                            type="text"
                                            value={stockName}
                                            onChange={(e) => setStockName(e.target.value)}
                                            placeholder="e.g. RELIANCE"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Segment</label>
                                        <select
                                            value={exchange}
                                            onChange={(e) => setExchange(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        >
                                            <option value="Future">Future</option>
                                            <option value="Option">Option</option>
                                            <option value="Equity">Equity</option>
                                            <option value="MCX">MCX</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            placeholder="e.g. 500"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Margin Amount Received (₹)</label>
                                        <input
                                            type="number"
                                            value={marginAmount}
                                            onChange={(e) => setMarginAmount(e.target.value)}
                                            placeholder="e.g. 100000"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Payment Mode</label>
                                    <select
                                        value={paymentMode}
                                        onChange={(e) => setPaymentMode(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    >
                                        <option value="Cash / UPI / Bank Transfer">Cash / UPI / Bank Transfer</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cash">Cash</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Amount in Words</label>
                            <input
                                type="text"
                                value={amountInWords}
                                onChange={(e) => setAmountInWords(e.target.value)}
                                placeholder="Auto-calculated"
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-600 dark:text-slate-300 outline-none text-xs italic"
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            className="w-full bg-[#00B050] hover:bg-[#009040] text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4 text-sm"
                        >
                            Generate Receipt
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const dateObj = new Date(receiptDate);
    const displayFormattedDate = isNaN(dateObj.getTime()) 
        ? receiptDate 
        : `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

    return (
        <div className="min-h-screen bg-slate-100 text-black p-8 print:p-0 flex flex-col items-center">
            {/* Control Panel */}
            <div className="w-full max-w-4xl mb-6 flex justify-between items-center print:hidden">
                <button onClick={() => setGenerated(false)} className="flex items-center gap-2 text-gray-600 hover:text-black font-semibold text-sm transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Edit
                </button>
                <button onClick={handleDownloadPDF} disabled={loading} className="flex items-center gap-2 bg-[#00B050] text-white px-5 py-2.5 rounded-lg hover:bg-[#009040] font-bold shadow-lg shadow-green-500/10 transition-all text-sm">
                    <Download className="w-4 h-4" /> {loading ? 'Downloading...' : 'Download PDF'}
                </button>
            </div>

            {/* Document Preview */}
            <div 
                id="invoice-content" 
                className="w-full max-w-[595px] min-h-[842px] border border-slate-200 bg-white shadow-xl p-10 relative flex flex-col justify-between"
                style={{ fontFamily: "'Inter', sans-serif" }}
            >
                {/* Thin outer border to match PDF */}
                <div className="absolute inset-5 border-2 border-[#000839] pointer-events-none rounded"></div>

                <div className="relative z-10 flex-grow">
                    {/* Header */}
                    <div className="flex justify-between items-start pb-4">
                        <div>
                            <img src={logo} alt="Radhe Brokerage Logo" className="h-15 w-auto object-contain" />
                            <p className="text-[7.5px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 pl-1">
                               
                            </p>
                        </div>
                    </div>

                    {/* Centered Capsule Title */}
                    <div className="flex justify-center my-6">
                        <div className="bg-[#000839] text-white px-6 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider">
                            MARGIN RECEIPT
                        </div>
                    </div>

                    {/* Receipt Meta */}
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-2 mt-4 px-2">
                        <span>Receipt No. : <span className="font-semibold text-slate-655">{receiptNo}</span></span>
                        <span>Date : <span className="font-semibold text-slate-655">{displayFormattedDate}</span></span>
                    </div>

                    {/* Horizontal Divider */}
                    <div className="border-b border-slate-200 mb-6"></div>

                    {/* Client Details Section */}
                    <div className="mb-6">
                        <div className="bg-[#000839] text-white px-3 py-1 rounded inline-block font-bold text-[9px] uppercase tracking-wider mb-2">
                            CLIENT DETAILS
                        </div>
                        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                            <div className="grid grid-cols-1 gap-1 text-[11px] font-semibold text-slate-700">
                                <div className="flex">
                                    <span className="w-28 text-slate-400">Client Name</span>
                                    <span className="mr-2">:</span>
                                    <span className="text-slate-900 font-bold">{clientName}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-28 text-slate-400">Client ID</span>
                                    <span className="mr-2">:</span>
                                    <span className="text-slate-900 font-bold">{clientCode}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-28 text-slate-400">Mobile No.</span>
                                    <span className="mr-2">:</span>
                                    <span className="text-slate-900">{mobileNumber ? `XXXXXX${mobileNumber}` : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Margin Details Section */}
                    <div className="mb-6">
                        <div className="bg-[#000839] text-white px-3 py-1 rounded inline-block font-bold text-[9px] uppercase tracking-wider mb-2">
                            MARGIN DETAILS
                        </div>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-xs text-left border-collapse">
                                <tbody>
                                    <tr className="border-b border-slate-200">
                                        <td className="w-40 px-3 py-2 bg-slate-50/50 font-bold text-slate-500 uppercase text-[9px]">Stock Name</td>
                                        <td className="px-3 py-2 font-bold text-slate-900">{stockName || 'N/A'}</td>
                                    </tr>
                                    <tr className="border-b border-slate-200">
                                        <td className="px-3 py-2 bg-slate-50/50 font-bold text-slate-500 uppercase text-[9px]">Exchange</td>
                                        <td className="px-3 py-2 text-slate-800">{exchange || 'N/A'}</td>
                                    </tr>
                                    <tr className="border-b border-slate-200">
                                        <td className="px-3 py-2 bg-slate-50/50 font-bold text-slate-500 uppercase text-[9px]">Quantity</td>
                                        <td className="px-3 py-2 text-slate-800 font-bold">{quantity ? Number(quantity).toLocaleString() : 'N/A'}</td>
                                    </tr>
                                    <tr className="border-b border-slate-200">
                                        <td className="px-3 py-2 bg-slate-50/50 font-bold text-slate-500 uppercase text-[9px]">Margin Amount Received</td>
                                        <td className="px-3 py-2 text-slate-900 font-extrabold text-sm">₹ {formatIndianCurrency(marginAmount)}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 bg-slate-50/50 font-bold text-slate-500 uppercase text-[9px]">Payment Mode</td>
                                        <td className="px-3 py-2 text-slate-800">{paymentMode}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Purpose Section */}
                    <div className="mb-6">
                        <div className="bg-[#000839] text-white px-3 py-1 rounded inline-block font-bold text-[9px] uppercase tracking-wider mb-2">
                            PURPOSE
                        </div>
                        <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/30 text-[10px] leading-relaxed text-slate-700">
                            {purpose}
                        </div>
                    </div>

                    {/* Amount in Words */}
                    <div className="flex items-center text-xs font-semibold text-slate-700 mb-8">
                        <span className="text-slate-400 shrink-0">Amount in Words :</span>
                        <span className="ml-2 font-bold italic border-b border-slate-200 flex-grow pb-0.5 text-slate-900">
                            {amountInWords || 'N/A'}
                        </span>
                    </div>

                    {/* Footer Box, Seal and Signatures */}
                    <div className="flex justify-between items-end mt-8">
                        {/* Currency Dash Box */}
                       
                            <span className="text-sm font-black text-[#000839]">
                                ₹ {formatIndianCurrency(marginAmount)}
                            </span>
                        

                        {/* Received By and Stamp placeholder */}
                        <div className="flex flex-col items-center justify-center relative w-44 select-none mb-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Received By</span>
                            <span className="text-[10px] font-bold text-slate-900 uppercase">RADHE BROKERAGE PVT. LTD.</span>
                        </div>

                        {/* Authorized Signatory */}
                        <div className="flex flex-col items-end w-44 relative pr-2">
                            <div className="h-12 w-32 relative select-none flex items-center justify-center">
                            </div>
                            <div className="w-36 border-t border-slate-300 my-1"></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide text-center w-36">Authorized Signatory</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Disclaimer */}
                <div className="relative z-10 border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 text-[8.5px] leading-relaxed text-slate-400 mt-6">
                    Note: margin has received, it will be block until trade exit, after trade exit it will be free
                </div>

                {/* Corner Design Accent */}
                <div className="absolute bottom-5 right-5 w-12 h-12 overflow-hidden pointer-events-none rounded-br">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform scale-110 origin-bottom-right">
                        <polygon points="100,0 0,100 100,100" fill="#000839" />
                        <polygon points="100,20 20,100 100,100" fill="#2563eb" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
