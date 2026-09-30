const Entry = require('../models/Entry');
const Exit = require('../models/Exit');

const normalizeTradeDate = (value) => {
  if (!value) return new Date();

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const createTrade = async (req, res) => {
  try {
    const { customerId, type, action, symbol, quantity, lot, price, ltp, marginRs, marginPct, date, brokeragePct, brokerageType, brokerageValue, tradeCategory } = req.body;

    if (!customerId || !type || !action || !symbol || !quantity || !price || !ltp || !date) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const qtyNum = parseFloat(quantity) || 0;
    const priceNum = parseFloat(price) || 0;
    const estimatedTotal = qtyNum * priceNum;

    // Server-side brokerage calculation
    let activeBrokerageType = brokerageType || 'percentage';
    let valInput = (brokerageValue !== undefined && brokerageValue !== '') ? brokerageValue : brokeragePct;
    let activeBrokerageValue = valInput !== undefined && valInput !== '' ? parseFloat(valInput) : 0.01;

    let activeBrokeragePct = 0.01;
    let brokerageFee = 0;

    if (activeBrokerageType === 'rupees') {
      activeBrokeragePct = 0;
      brokerageFee = isNaN(activeBrokerageValue) ? 0 : activeBrokerageValue;
    } else {
      activeBrokeragePct = isNaN(activeBrokerageValue) ? 0.01 : activeBrokerageValue;
      brokerageFee = (estimatedTotal * activeBrokeragePct) / 100;
    }

    const tradeData = {
      customerId,
      action: action.toLowerCase(),
      symbol: symbol.toUpperCase(),
      quantity: qtyNum,
      lot: parseFloat(lot) || 0,
      price: priceNum,
      ltp: parseFloat(ltp) || 0,
      marginRs: parseFloat(marginRs) || (parseFloat(marginPct) > 0 ? (estimatedTotal * parseFloat(marginPct) / 100) : 0),
      marginPct: parseFloat(marginPct) || 0,
      date: normalizeTradeDate(date),
      brokerageType: activeBrokerageType,
      brokerageValue: activeBrokerageType === 'rupees' ? (isNaN(activeBrokerageValue) ? 0 : activeBrokerageValue) : activeBrokeragePct,
      brokeragePct: activeBrokeragePct,
      brokerageFee,
      estimatedTotal,
      tradeCategory: tradeCategory || 'normal'
    };

    let savedTrade;
    let avgCost = 0;
    if (type === 'entry') {
      savedTrade = await Entry.create(tradeData);
    } else if (type === 'exit') {
      // Calculate Realized PNL directly from the form since entries/exits are decoupled
      // In Exit Form: 'price' is Entry Price, 'ltp' is Exit Price
      let realizedPnl = 0;
      if (action.toLowerCase() === 'buy') { // Exiting a Long position (originally bought)
        realizedPnl = (parseFloat(ltp) - priceNum) * qtyNum;
      } else if (action.toLowerCase() === 'sell') { // Exiting a Short position (originally sold)
        realizedPnl = (priceNum - parseFloat(ltp)) * qtyNum;
      }

      realizedPnl -= brokerageFee;
      tradeData.realizedPnl = realizedPnl;

      savedTrade = await Exit.create(tradeData);
    } else {
      return res.status(400).json({ message: 'Invalid trade type' });
    }

    let responseTrade = savedTrade.toObject();
    if (type === 'exit') {
      responseTrade.entryPrice = avgCost;
    }

    res.status(201).json(responseTrade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomerHoldings = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    // Fetch entries for Holdings tab - list each trade entry individually without grouping by symbol
    const entries = await Entry.find({ customerId }).sort({ date: -1, createdAt: -1 }).lean();

    const holdings = entries.map(trade => {
      const qtyNum = trade.quantity || 0;
      const priceNum = trade.price || 0;
      const ltpNum = trade.ltp !== undefined && trade.ltp !== null ? trade.ltp : priceNum;
      const actionStr = (trade.action || 'buy').toLowerCase();
      const brokerageFee = trade.brokerageFee || 0;
      const marginRs = trade.marginRs || (trade.marginPct ? (qtyNum * priceNum * trade.marginPct / 100) : 0);

      // Unrealized P/L calculation for this individual trade entry
      let upnl = 0;
      if (actionStr === 'buy') {
        upnl = (ltpNum - priceNum) * qtyNum;
      } else {
        upnl = (priceNum - ltpNum) * qtyNum;
      }
      upnl -= brokerageFee;

      const totalInvestment = trade.customInvested !== undefined && trade.customInvested !== null 
        ? trade.customInvested 
        : (qtyNum * priceNum);
        
      const finalUpnl = trade.customUpnl !== undefined && trade.customUpnl !== null 
        ? trade.customUpnl 
        : upnl;

      const finalTotalPnl = trade.customTotalPnl !== undefined && trade.customTotalPnl !== null 
        ? trade.customTotalPnl 
        : upnl;

      const totalValue = trade.customInvested !== undefined && trade.customInvested !== null
        ? (trade.customInvested + finalUpnl)
        : ((qtyNum * priceNum) + finalUpnl);

      return {
        _id: trade._id,
        symbol: trade.symbol,
        netQty: qtyNum,
        lot: trade.lot || 0,
        type: actionStr === 'buy' ? 'Buy' : 'Sell',
        avgCost: priceNum,
        lastPrice: ltpNum,
        totalInvestment,
        totalValue,
        totalBrokerage: brokerageFee,
        totalMargin: marginRs,
        upnl: finalUpnl,
        totalPnl: finalTotalPnl,
        lastUpdated: trade.createdAt || trade.date,
        date: trade.date,
        tradeCategory: trade.tradeCategory || 'normal',
        marginPct: trade.marginPct || 0,
        action: trade.action,
        quantity: qtyNum,
        price: priceNum,
        ltp: ltpNum,
        brokerageFee,
        customInvested: trade.customInvested,
        customUpnl: trade.customUpnl,
        customTotalPnl: trade.customTotalPnl
      };
    });

    res.json(holdings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWeeklyRecords = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    const exits = await Exit.find({ customerId }).sort({ date: -1, createdAt: -1 }).lean();
    res.json(exits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteHolding = async (req, res) => {
  try {
    const { customerId, symbol, id } = req.params;

    // Delete single entry by ID if provided or if customerId parameter contains trade _id
    const targetId = id || (customerId && customerId.length === 24 && (!symbol || symbol.length === 24) ? customerId : null);
    if (targetId) {
      await Entry.findByIdAndDelete(targetId);
      return res.json({ message: 'Holding deleted successfully' });
    }

    if (!customerId || !symbol) {
      return res.status(400).json({ message: 'Customer ID and Symbol are required' });
    }

    // Delete all entries and exits for this symbol
    await Entry.deleteMany({ customerId, symbol: symbol.toUpperCase() });
    await Exit.deleteMany({ customerId, symbol: symbol.toUpperCase() });

    res.json({ message: 'Holding deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const editHolding = async (req, res) => {
  try {
    const { customerId, symbol, id } = req.params;
    const { quantity, lot, price, ltp, marginRs, brokerageFee, invested, unrealisedPnl, totalPnl, tradeCategory } = req.body;

    let targetEntry;
    const targetId = id || (customerId && customerId.length === 24 && (!symbol || symbol.length === 24) ? customerId : null);
    if (targetId) {
      targetEntry = await Entry.findById(targetId);
    } else if (customerId && symbol) {
      const entries = await Entry.find({ customerId, symbol: symbol.toUpperCase() }).sort({ date: -1 });
      targetEntry = entries[0];
    }

    if (!targetEntry) {
      return res.status(404).json({ message: 'Holding trade not found' });
    }

    if (quantity !== undefined) targetEntry.quantity = parseFloat(quantity) || 0;
    if (lot !== undefined) targetEntry.lot = parseFloat(lot) || 0;
    if (price !== undefined) targetEntry.price = parseFloat(price) || 0;
    if (ltp !== undefined) targetEntry.ltp = parseFloat(ltp) || 0;
    if (marginRs !== undefined) targetEntry.marginRs = parseFloat(marginRs) || 0;
    if (tradeCategory !== undefined) targetEntry.tradeCategory = tradeCategory;

    // Custom overrides for display
    if (invested !== undefined) targetEntry.customInvested = parseFloat(invested) || 0;
    if (unrealisedPnl !== undefined) targetEntry.customUpnl = parseFloat(unrealisedPnl) || 0;
    if (totalPnl !== undefined) targetEntry.customTotalPnl = parseFloat(totalPnl) || 0;

    targetEntry.estimatedTotal = targetEntry.quantity * targetEntry.price;

    if (brokerageFee !== undefined) {
      targetEntry.brokerageFee = parseFloat(brokerageFee) || 0;
      targetEntry.brokerageType = 'rupees';
      targetEntry.brokerageValue = targetEntry.brokerageFee;
      targetEntry.brokeragePct = 0;
    } else {
      if (targetEntry.brokerageType === 'rupees') {
        targetEntry.brokerageFee = targetEntry.brokerageValue || 0;
        targetEntry.brokeragePct = 0;
      } else {
        targetEntry.brokerageFee = (targetEntry.estimatedTotal * (targetEntry.brokerageValue || targetEntry.brokeragePct || 0.01)) / 100;
      }
    }

    const activeAction = (targetEntry.action || 'buy').toLowerCase();
    let calculatedUpnl = 0;
    if (activeAction === 'buy') {
      calculatedUpnl = (targetEntry.ltp - targetEntry.price) * targetEntry.quantity;
    } else {
      calculatedUpnl = (targetEntry.price - targetEntry.ltp) * targetEntry.quantity;
    }
    calculatedUpnl -= targetEntry.brokerageFee;

    if (targetEntry.customUpnl !== undefined && targetEntry.customUpnl !== null) {
      targetEntry.customUpnl = calculatedUpnl;
    }
    if (targetEntry.customTotalPnl !== undefined && targetEntry.customTotalPnl !== null) {
      targetEntry.customTotalPnl = calculatedUpnl;
    }

    await targetEntry.save();

    res.json({ message: 'Holding updated successfully', trade: targetEntry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteExit = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Exit ID is required' });
    }

    await Exit.findByIdAndDelete(id);

    res.json({ message: 'Exit record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const editTrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, action, symbol, quantity, lot, price, ltp, marginRs, marginPct, date, brokeragePct, brokerageType, brokerageValue, tradeCategory } = req.body;

    if (!id || !type || !action || !symbol || (quantity === undefined || quantity === null || quantity === '') || (price === undefined || price === null || price === '') || (ltp === undefined || ltp === null || ltp === '') || !date) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const qtyNum = parseFloat(quantity) || 0;
    const priceNum = parseFloat(price) || 0;
    const estimatedTotal = qtyNum * priceNum;

    // Server-side brokerage calculation
    let activeBrokerageType = brokerageType || 'percentage';
    let valInput = (brokerageValue !== undefined && brokerageValue !== '') ? brokerageValue : brokeragePct;
    let activeBrokerageValue = valInput !== undefined && valInput !== '' ? parseFloat(valInput) : 0.01;

    let activeBrokeragePct = 0.01;
    let brokerageFee = 0;

    if (activeBrokerageType === 'rupees') {
      activeBrokeragePct = 0;
      brokerageFee = isNaN(activeBrokerageValue) ? 0 : activeBrokerageValue;
    } else {
      activeBrokeragePct = isNaN(activeBrokerageValue) ? 0.01 : activeBrokerageValue;
      brokerageFee = (estimatedTotal * activeBrokeragePct) / 100;
    }

    const tradeData = {
      action: action.toLowerCase(),
      symbol: symbol.toUpperCase(),
      quantity: qtyNum,
      lot: parseFloat(lot) || 0,
      price: priceNum,
      ltp: parseFloat(ltp) || 0,
      marginRs: parseFloat(marginRs) || (parseFloat(marginPct) > 0 ? (estimatedTotal * parseFloat(marginPct) / 100) : 0),
      marginPct: parseFloat(marginPct) || 0,
      date: normalizeTradeDate(date),
      brokerageType: activeBrokerageType,
      brokerageValue: activeBrokerageType === 'rupees' ? (isNaN(activeBrokerageValue) ? 0 : activeBrokerageValue) : activeBrokeragePct,
      brokeragePct: activeBrokeragePct,
      brokerageFee,
      estimatedTotal,
      tradeCategory: tradeCategory || 'normal'
    };

    let updatedTrade;
    if (type === 'entry') {
      updatedTrade = await Entry.findByIdAndUpdate(id, tradeData, { returnDocument: 'after' });
    } else if (type === 'exit') {
      let realizedPnl = 0;
      if (action.toLowerCase() === 'buy') { // Exiting a Long position (originally bought)
        realizedPnl = (parseFloat(ltp) - priceNum) * qtyNum;
      } else if (action.toLowerCase() === 'sell') { // Exiting a Short position (originally sold)
        realizedPnl = (priceNum - parseFloat(ltp)) * qtyNum;
      }
      realizedPnl -= brokerageFee;
      tradeData.realizedPnl = realizedPnl;

      updatedTrade = await Exit.findByIdAndUpdate(id, tradeData, { returnDocument: 'after' });
    } else {
      return res.status(400).json({ message: 'Invalid trade type' });
    }

    if (!updatedTrade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    res.json(updatedTrade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkDeleteEntries = async (req, res) => {
  try {
    const { customerId, symbols } = req.body;
    if (customerId && symbols && Array.isArray(symbols) && symbols.length > 0) {
      const upperSymbols = symbols.map(s => s.toUpperCase());
      await Entry.deleteMany({ customerId, symbol: { $in: upperSymbols } });
      await Exit.deleteMany({ customerId, symbol: { $in: upperSymbols } });
      return res.json({ message: 'Holdings deleted successfully' });
    }

    const { ids } = req.body;
    if (ids && Array.isArray(ids) && ids.length > 0) {
      await Entry.deleteMany({ _id: { $in: ids } });
      return res.json({ message: 'Entries deleted successfully' });
    }

    res.status(400).json({ message: 'Invalid payload for bulk delete. Provide symbols or ids.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const bulkDeleteExits = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No IDs provided for deletion' });
    }

    await Exit.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Exits deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTrade,
  getCustomerHoldings,
  getWeeklyRecords,
  deleteHolding,
  editHolding,
  deleteExit,
  editTrade,
  bulkDeleteEntries,
  bulkDeleteExits
};
