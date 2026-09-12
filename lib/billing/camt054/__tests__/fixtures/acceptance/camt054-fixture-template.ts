/**
 * Synthetic camt.054 acceptance fixtures (no production bank data).
 * Replace {{QRR}} with the operational QRR for invoice 2026-000003 on STAGE.
 */

export function buildSyntheticCamt054Xml(input: {
  messageId: string;
  bankTransactionId: string;
  amountMajor: string;
  currency: string;
  bookingDate: string;
  qrrReference: string;
  debtorName?: string;
}): string {
  const debtorBlock = input.debtorName
    ? `<RltdPties><Dbtr><Nm>${input.debtorName}</Nm></Dbtr></RltdPties>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.04">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr>
      <MsgId>${input.messageId}</MsgId>
    </GrpHdr>
    <Ntfctn>
      <Ntry>
        <Amt Ccy="${input.currency}">${input.amountMajor}</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>${input.bookingDate}</Dt></BookgDt>
        <NtryDtls>
          <TxDtls>
            <Refs><AcctSvcrRef>${input.bankTransactionId}</AcctSvcrRef></Refs>
            <Amt Ccy="${input.currency}">${input.amountMajor}</Amt>
            <CdtDbtInd>CRDT</CdtDbtInd>
            ${debtorBlock}
            <RmtInf>
              <Strd>
                <CdtrRefInf>
                  <Tp><CdOrPrtry><Prtry>QRR</Prtry></CdOrPrtry></Tp>
                  <Ref>${input.qrrReference}</Ref>
                </CdtrRefInf>
              </Strd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>`;
}

/** PO primary fixture — substitute QRR from STAGE invoice 2026-000003 payment instruction. */
export const ACCEPTANCE_QRR_PLACEHOLDER = "273282026000002025434650072";
