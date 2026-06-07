"use client";
import Link from "next/link";

export default function TermsPage() {
  const updated = "June 7, 2026";
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-12">
        <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-steel mb-4">Legal</div>
        <h1 className="font-display font-black text-4xl text-bone mb-3">Terms & Conditions</h1>
        <div className="font-mono text-xs text-steel">Last updated: {updated}</div>
      </div>

      <div className="space-y-10 text-bone/70 text-sm leading-relaxed">

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">1. Overview</h2>
          <p>
            These Terms and Conditions govern all orders placed with Dragline 3D LLC ("Dragline 3D," "we," "us," or "our"),
            a 3D printing service based in Louisville, Kentucky. By placing an order, you ("customer," "you") agree to
            these terms in full. If you do not agree, do not place an order.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">2. Customer-Provided Designs</h2>
          <p className="mb-3">
            All parts are manufactured strictly to the specifications provided by the customer via uploaded STL, 3MF,
            or STEP files. You are solely responsible for the accuracy, completeness, and suitability of your design files.
          </p>
          <p>
            Dragline 3D does not review, validate, or modify customer designs for structural integrity, dimensional
            accuracy, or fitness for any intended use. Any errors, omissions, or defects present in your design files
            will be reflected in the printed part.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">3. No Warranty</h2>
          <p className="mb-3">
            Parts are provided <strong className="text-bone">as-is</strong>. Dragline 3D makes no warranties, express or
            implied, including but not limited to warranties of merchantability or fitness for a particular purpose.
          </p>
          <p>
            Material properties (strength, flexibility, heat resistance, etc.) are provided as general guidance only.
            Actual performance will vary based on design geometry, print orientation, environmental conditions, and
            intended use. It is your responsibility to validate that a part meets your requirements before use.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">4. Limitation of Liability</h2>
          <p className="mb-3">
            Dragline 3D LLC shall not be liable for any direct, indirect, incidental, special, or consequential damages
            arising from the use, misuse, or failure of any part we manufacture, including but not limited to personal
            injury, property damage, or loss of revenue.
          </p>
          <p>
            Our total liability for any claim arising from an order shall not exceed the amount paid for that specific order.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">5. Safety-Critical Applications</h2>
          <p className="mb-3">
            FDM 3D printed parts are <strong className="text-bone">not certified or suitable</strong> for use in
            safety-critical applications including but not limited to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
            <li>Medical devices or implants</li>
            <li>Aerospace or aviation components</li>
            <li>Structural or load-bearing applications without independent engineering review</li>
            <li>Firearms or weapons components</li>
            <li>Child safety products</li>
            <li>Any application where failure could result in injury or death</li>
          </ul>
          <p>
            By placing an order, you confirm that your parts will not be used in any safety-critical application without
            appropriate independent engineering review and certification.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">6. Intellectual Property</h2>
          <p className="mb-3">
            You represent and warrant that you own or have the legal right to manufacture the designs you submit.
            Dragline 3D will not knowingly manufacture parts that infringe on third-party patents, trademarks, or
            copyrights. We reserve the right to refuse any order we believe may violate intellectual property rights.
          </p>
          <p>
            Dragline 3D does not claim ownership of your design files. We retain the right to store files for order
            fulfillment and reorder purposes only.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">7. Pricing & Payment</h2>
          <p className="mb-3">
            All prices are quoted in USD and include a 6% Kentucky sales tax where applicable. Quotes are generated
            based on your design file and selected options at the time of order. Prices are subject to change without
            notice for future orders.
          </p>
          <p>
            Payment is processed securely through Square. Dragline 3D does not store payment card information.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">8. Refunds & Reprints</h2>
          <p className="mb-3">
            We stand behind our print quality. If a part has a manufacturing defect caused by our process (not your
            design), contact us within 7 days of delivery and we will reprint or refund at our discretion.
          </p>
          <p>
            Refunds or reprints are not provided for parts that match the customer's design file but do not perform
            as the customer intended. Design validation is the customer's responsibility.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">9. Turnaround & Shipping</h2>
          <p>
            Estimated turnaround times are provided as guidance only and are not guaranteed. Dragline 3D is not
            responsible for delays caused by shipping carriers, supply chain issues, or circumstances beyond our
            control. Shipping costs are calculated at checkout and are non-refundable once a label has been purchased.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">10. Governing Law</h2>
          <p>
            These terms are governed by the laws of the Commonwealth of Kentucky. Any disputes shall be resolved
            in the courts of Jefferson County, Kentucky.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-bone mb-3">11. Contact</h2>
          <p>
            Questions about these terms? Reach us at{" "}
            <a href="mailto:info@dragline3d.com" className="text-amber hover:underline">
              info@dragline3d.com
            </a>
            {" "}or via our{" "}
            <Link href="/contact" className="text-amber hover:underline">contact page</Link>.
          </p>
        </section>

      </div>
    </div>
  );
}
