import React from "react";
import { motion } from "framer-motion";
import { Eye, FileText } from "lucide-react";

const ReceiptActions = ({ receipt, onView }) => {
  const hasImages = receipt?.image_urls?.length > 0;
  const hasPdf = !!receipt?.pdf_url;

  return (
    <div className="view-receipt-container">
      <div className="button-container">
        <motion.button
          className={`view-button ${!hasImages ? 'disabled' : ''}`}
          onClick={() => hasImages && onView(receipt)}
          disabled={!hasImages}
          whileHover={hasImages ? { scale: 1.05 } : {}}
          whileTap={hasImages ? { scale: 0.95 } : {}}
        >
          <Eye size={18} />
          <span>View</span>
        </motion.button>

        {hasPdf && (
          <motion.button
            className="view-button pdf-button"
            onClick={() => onView(receipt)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FileText size={18} />
            <span>PDF</span>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default ReceiptActions;