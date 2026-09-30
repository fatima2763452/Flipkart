import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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

export default function PaymentReceipt() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id: customerId } = useParams();
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);

    // Form inputs
    const [receiptNo, setReceiptNo] = useState('');
    const [receiptDate, setReceiptDate] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientCode, setClientCode] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    
    // Dynamic Payment Details
    const [paymentType, setPaymentType] = useState('Both'); // Options: 'Both', 'Received Amount', 'Pending Amount'
    const [receivedAmount, setReceivedAmount] = useState('');
    const [pendingAmount, setPendingAmount] = useState('');
    const [amountInWords, setAmountInWords] = useState('');

    useEffect(() => {
        // Prefill default Receipt No
        const year = new Date().getFullYear();
        const randNum = Math.floor(1000 + Math.random() * 9000);
        setReceiptNo(`PR-${year}-${randNum}`);

        // Prefill asset caches
        getLogoAsset(logo);

        // Fetch Customer details from DB or location state
        const fetchCustomerDetails = async () => {
            if (location.state?.customer) {
                const c = location.state.customer;
                setClientName(c.name || '');
                setClientCode(c.customerId || c.id || '');
                setMobileNumber(c.mobileLast4 || '');
            }

            try {
                const userInfoStr = localStorage.getItem('userInfo');
                if (!userInfoStr) return;
                const userInfo = JSON.parse(userInfoStr);
                const ownerId = userInfo?._id;
                if (!ownerId) return;

                const res = await api.get(`/customers?ownerId=${ownerId}`);
                const customer = res.data.find(c => c._id === customerId || c.customerId === customerId);
                if (customer) {
                    setClientName(customer.name || '');
                    setClientCode(customer.customerId || '');
                    setMobileNumber(customer.mobileLast4 || '');
                }
            } catch (err) {
                console.error("Error fetching customer for payment receipt:", err);
            }
        };

        fetchCustomerDetails();
    }, [customerId, location.state]);

    // Calculate Total Amount based on selected type
    const getTotalAmount = () => {
        if (paymentType === 'Both') {
            return (parseFloat(receivedAmount) || 0) + (parseFloat(pendingAmount) || 0);
        } else if (paymentType === 'Received Amount') {
            return parseFloat(receivedAmount) || 0;
        } else if (paymentType === 'Pending Amount') {
            return parseFloat(pendingAmount) || 0;
        }
        return 0;
    };

    // Update Amount in Words as Amounts change
    useEffect(() => {
        const total = getTotalAmount();
        if (total > 0) {
            setAmountInWords(numberToWords(total));
        } else {
            setAmountInWords('');
        }
    }, [paymentType, receivedAmount, pendingAmount]);

    const handleGenerate = () => {
        if (paymentType === 'Both') {
            if (!receivedAmount && !pendingAmount) {
                alert('Please fill out Received Amount or Pending Amount.');
                return;
            }
        } else if (paymentType === 'Received Amount') {
            if (!receivedAmount) {
                alert('Please fill out Received Amount.');
                return;
            }
        } else if (paymentType === 'Pending Amount') {
            if (!pendingAmount) {
                alert('Please fill out Pending Amount.');
                return;
            }
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

            // Centered Payment Receipt Capsule
            const capsuleW = 160;
            const capsuleH = 22;
            const capsuleX = (pageW - capsuleW) / 2;
            pdf.setFillColor(0, 8, 57);
            pdf.roundedRect(capsuleX, cursorY, capsuleW, capsuleH, 5, 5, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFont(activeFont, 'bold');
            pdf.setFontSize(10);
            pdf.text("PAYMENT RECEIPT", pageW / 2, cursorY + 14, { align: 'center' });

            cursorY += 40;

            // Receipt Meta (No and Date)
            pdf.setFontSize(8.5);
            pdf.setTextColor(15, 23, 42);
            pdf.setFont(activeFont, 'bold');
            pdf.text(`Receipt No. :  ${receiptNo}`, 40, cursorY);
            
            const dateObj = new Date(receiptDate);
            const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const formattedDate = (!receiptDate || isNaN(dateObj.getTime())) 
                ? (receiptDate || 'N/A') 
                : `${dateObj.getDate().toString().padStart(2, '0')}-${shortMonths[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
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
            pdf.text(clientCode || 'N/A', 130, clientCardY + 30);
            pdf.setFont(activeFont, 'normal');
            const displayMobile = mobileNumber ? `XXXXXX${mobileNumber}` : 'N/A';
            pdf.text(displayMobile, 130, clientCardY + 44);

            cursorY = clientCardY + clientCardH + 20;

            // PAYMENT DETAILS Section
            pdf.setFillColor(0, 8, 57);
            pdf.roundedRect(40, cursorY, 100, 18, 3, 3, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont(activeFont, 'bold');
            pdf.text("PAYMENT DETAILS", 45, cursorY + 12);

            const gridY = cursorY + 24;
            const gridRowH = 22;

            const rows = [];
            if (paymentType === 'Both' || paymentType === 'Received Amount') {
                rows.push({ label: 'Received Amount', value: `Rs. ${formatIndianCurrency(receivedAmount)}` });
            }
            if (paymentType === 'Both' || paymentType === 'Pending Amount') {
                rows.push({ label: 'Pending Amount', value: `Rs. ${formatIndianCurrency(pendingAmount)}` });
            }

            const gridH = gridRowH * rows.length;
            pdf.setDrawColor(226, 232, 240);
            pdf.rect(40, gridY, pageW - 80, gridH, 'D');

            // Draw horizontal lines in table
            for (let i = 1; i < rows.length; i++) {
                pdf.line(40, gridY + i * gridRowH, pageW - 40, gridY + i * gridRowH);
            }
            // Draw vertical column divider
            pdf.line(160, gridY, 160, gridY + gridH);

            rows.forEach((row, idx) => {
                const rowY = gridY + idx * gridRowH + 15;
                pdf.setTextColor(100, 116, 139);
                pdf.setFont(activeFont, 'normal');
                pdf.text(row.label, 50, rowY);

                pdf.setTextColor(15, 23, 42);
                pdf.text(":", 150, rowY);

                pdf.setFont(activeFont, 'bold');
                pdf.text(row.value, 170, rowY);
            });

            cursorY = gridY + gridH + 30;

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

            // Bottom Section
            const footerY = cursorY + 10;

            // Currency text (Left) - Only show for single input
            if (paymentType === 'Received Amount') {
                pdf.setFont(activeFont, 'bold');
                pdf.setFontSize(13);
                pdf.text(`Rs. ${formatIndianCurrency(receivedAmount)}`, 40, footerY + 26);
            } else if (paymentType === 'Pending Amount') {
                pdf.setFont(activeFont, 'bold');
                pdf.setFontSize(13);
                pdf.text(`Rs. ${formatIndianCurrency(pendingAmount)}`, 40, footerY + 26);
            }

            // Received By
            const centerColX = 280;
            pdf.setFontSize(8);
            pdf.setFont(activeFont, 'bold');

            // Bottom Disclaimer Note
            const noteY = 740;
            pdf.setFillColor(248, 250, 252);
            pdf.setDrawColor(226, 232, 240);
            pdf.roundedRect(40, noteY, pageW - 80, 30, 4, 4, 'FD');

            pdf.setFont(activeFont, 'normal');
            pdf.setFontSize(6.5);
            pdf.setTextColor(100, 116, 139);
            const disclaimerNote = "Note: payment has received, it will be block until trade exit, after trade exit it will be free";
            const noteLines = pdf.splitTextToSize(disclaimerNote, pageW - 100);
            pdf.text(noteLines, 50, noteY + 11);

            // Bottom Right Corner Geometric Accent
            pdf.setFillColor(0, 8, 57);
            pdf.triangle(pageW - 20, pageH - 50, pageW - 50, pageH - 20, pageW - 20, pageH - 20, 'F');
            pdf.setFillColor(37, 99, 235);
            pdf.triangle(pageW - 20, pageH - 40, pageW - 40, pageH - 20, pageW - 20, pageH - 20, 'F');

            // Save PDF
            const safeClientName = (clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
            pdf.save(`${safeClientName}_Payment_Receipt_${receiptNo}.pdf`);

        } catch (error) {
            console.error('PDF Error:', error);
            alert(`PDF generation failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!generated) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-black p-4 flex flex-col items-center pt-20">
                <div className="w-full max-w-lg bg-white dark:bg-slate-950 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full text-slate-700 dark:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create Payment Receipt</h1>
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
                            </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Payment Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Select Payment Type</label>
                                    <select
                                        value={paymentType}
                                        onChange={(e) => setPaymentType(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold cursor-pointer"
                                    >
                                        <option value="Both">Both (Received & Pending)</option>
                                        <option value="Received Amount">Received Amount</option>
                                        <option value="Pending Amount">Pending Amount</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {(paymentType === 'Both' || paymentType === 'Received Amount') && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Received Amount (₹)</label>
                                            <input
                                                type="number"
                                                value={receivedAmount}
                                                onChange={(e) => setReceivedAmount(e.target.value)}
                                                placeholder="e.g. 50000"
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                                            />
                                        </div>
                                    )}

                                    {(paymentType === 'Both' || paymentType === 'Pending Amount') && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Pending Amount (₹)</label>
                                            <input
                                                type="number"
                                                value={pendingAmount}
                                                onChange={(e) => setPendingAmount(e.target.value)}
                                                placeholder="e.g. 20000"
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                                            />
                                        </div>
                                    )}
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
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const displayFormattedDate = (!receiptDate || isNaN(dateObj.getTime())) 
        ? (receiptDate || 'N/A') 
        : `${dateObj.getDate().toString().padStart(2, '0')}-${shortMonths[dateObj.getMonth()]}-${dateObj.getFullYear()}`;

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
                            <img src={logo} alt="Grow Capital Logo" className="h-15 w-auto object-contain" />
                        </div>
                    </div>

                    {/* Centered Capsule Title */}
                    <div className="flex justify-center my-6">
                        <div className="bg-[#000839] text-white px-6 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider">
                            PAYMENT RECEIPT
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
                                    <span className="text-slate-900 font-bold font-mono">{clientCode || 'N/A'}</span>
                                </div>
                                <div className="flex">
                                    <span className="w-28 text-slate-400">Mobile No.</span>
                                    <span className="mr-2">:</span>
                                    <span className="text-slate-900">{mobileNumber ? `XXXXXX${mobileNumber}` : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Details Section */}
                    <div className="mb-6">
                        <div className="bg-[#000839] text-white px-3 py-1 rounded inline-block font-bold text-[9px] uppercase tracking-wider mb-2">
                            PAYMENT DETAILS
                        </div>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-xs text-left border-collapse">
                                <tbody>
                                    {(paymentType === 'Both' || paymentType === 'Received Amount') && (
                                        <tr className={paymentType === 'Both' ? "border-b border-slate-200" : ""}>
                                            <td className="w-40 px-3 py-2.5 bg-slate-50/50 font-bold text-slate-500 uppercase text-[9px]">Received Amount</td>
                                            <td className="px-3 py-2.5 font-bold text-slate-900 text-sm">₹ {formatIndianCurrency(receivedAmount)}</td>
                                        </tr>
                                    )}
                                    {(paymentType === 'Both' || paymentType === 'Pending Amount') && (
                                        <tr>
                                            <td className="w-40 px-3 py-2.5 bg-slate-50/50 font-bold text-slate-500 uppercase text-[9px]">Pending Amount</td>
                                            <td className="px-3 py-2.5 font-bold text-slate-900 text-sm">₹ {formatIndianCurrency(pendingAmount)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
                        <div>
                            {paymentType === 'Received Amount' && (
                                <span className="text-sm font-black text-[#000839]">
                                    ₹ {formatIndianCurrency(receivedAmount)}
                                </span>
                            )}
                            {paymentType === 'Pending Amount' && (
                                <span className="text-sm font-black text-[#000839]">
                                    ₹ {formatIndianCurrency(pendingAmount)}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col items-center justify-center relative w-44 select-none mb-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Received By</span>
                            <span className="text-[10px] font-bold text-slate-900 uppercase">GROW CAPITAL PVT. LTD.</span>
                        </div>

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
                    Note: payment has received, it will be block until trade exit, after trade exit it will be free
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
