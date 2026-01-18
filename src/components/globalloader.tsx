import React, { useEffect, useRef } from "react";
import "./GlobalLoader.css";

interface GlobalLoaderProps {
  /** Size of the loader in pixels (default: 80) */
  size?: number;
  /** Whether to show the loader as a full-screen overlay */
  fullScreen?: boolean;
  /** Optional custom message to display below the loader */
  message?: string;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({
  size = 80,
  fullScreen = false,
  message,
}) => {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      document.documentElement.style.setProperty("--path-len", String(length));
    }
  }, []);

  const loaderContent = (
    <div className="global-loader-container" style={{ width: size }}>
      <svg viewBox="0 0 681 762" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <path
            ref={pathRef}
            id="main-path"
            d="M165.71 10.7737L7.10164 140.546C2.92325 143.965 0.5 149.078 0.5 154.477V606.368C0.5 611.756 2.91313 616.86 7.07661 620.279L165.483 750.362C166.975 751.588 168.655 752.565 170.458 753.257L185.177 758.906C187.236 759.696 189.422 760.101 191.627 760.101H654.367C656.401 760.101 658.422 759.756 660.341 759.08L667.834 756.444C675.039 753.909 679.86 747.102 679.86 739.464V568.901C679.86 564.048 677.9 559.4 674.425 556.012L551.832 436.495C540.428 425.377 521.266 433.457 521.266 449.383V596.878C521.266 606.82 513.207 614.878 503.266 614.878H185.736C175.795 614.878 167.736 606.82 167.736 596.878V163.947C167.736 154.006 175.795 145.947 185.736 145.947H188.291H503.266C513.207 145.947 521.266 154.006 521.266 163.947V165.045V312.378C521.266 328.322 540.466 336.394 551.859 325.239L674.453 205.213C677.911 201.827 679.86 197.191 679.86 192.351V21.4819C679.86 14.0324 675.271 7.35256 668.317 4.68009L660.558 1.69815C658.498 0.906142 656.309 0.5 654.101 0.5H191.911C189.522 0.5 187.156 0.975723 184.953 1.89943L170.15 8.10432C168.549 8.77538 167.054 9.67449 165.71 10.7737Z"
          />
        </defs>

        <use href="#main-path" className="shape-base" />
        <use href="#main-path" className="light-trace" />
      </svg>
      {message && <p className="global-loader-message">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="global-loader-overlay">{loaderContent}</div>;
  }

  return loaderContent;
};

export default GlobalLoader;
