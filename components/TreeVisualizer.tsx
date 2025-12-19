import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DecisionTreeNode } from '../types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface TreeVisualizerProps {
    root: DecisionTreeNode;
    width?: number;
    height?: number;
}

interface NodePosition {
    x: number;
    y: number;
    node: DecisionTreeNode;
    id: string;
}

const TreeVisualizer: React.FC<TreeVisualizerProps> = ({ root, width = 800, height = 600 }) => {
    // Zoom & Pan State
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate node positions (Memoized)
    const { nodes, links, bounds } = useMemo(() => {
        const nodes: NodePosition[] = [];
        const links: { source: NodePosition, target: NodePosition, label: string }[] = [];

        let idCounter = 0;
        const generateId = () => `node-${idCounter++}`;

        // Helper to determine width
        const getSubtreeWidth = (node: DecisionTreeNode): number => {
            if (node.isLeaf) return 1;
            let w = 0;
            if (node.left) w += getSubtreeWidth(node.left);
            if (node.right) w += getSubtreeWidth(node.right);
            return w;
        };

        const totalLeaves = getSubtreeWidth(root);
        // Better spacing: wider spacing for larger trees
        const leafWidth = Math.max(80, width / totalLeaves);
        // Helper to get max depth
        const getMaxDepth = (node: DecisionTreeNode | undefined): number => {
            if (!node) return 0;
            return 1 + Math.max(getMaxDepth(node.left), getMaxDepth(node.right));
        };

        const layerHeight = 100; // Fixed vertical spacing is better than fitting to height

        let currentLeafIndex = 0;
        let minX = Infinity;
        let maxX = -Infinity;
        let maxY = 0;

        const buildTree = (node: DecisionTreeNode, depth: number): NodePosition => {
            const id = generateId();
            let x: number;
            let leftChildPos: NodePosition | undefined;
            let rightChildPos: NodePosition | undefined;

            if (node.left) {
                leftChildPos = buildTree(node.left, depth + 1);
            }
            if (node.right) {
                rightChildPos = buildTree(node.right, depth + 1);
            }

            if (node.isLeaf) {
                // Place leaf
                x = (currentLeafIndex * leafWidth);
                currentLeafIndex++;
            } else {
                if (leftChildPos && rightChildPos) {
                    x = (leftChildPos.x + rightChildPos.x) / 2;
                } else if (leftChildPos) {
                    x = leftChildPos.x;
                } else if (rightChildPos) {
                    x = rightChildPos.x;
                } else {
                    x = 0;
                }
            }

            const y = depth * layerHeight;
            const pos = { x, y, node, id };
            nodes.push(pos);

            // Track bounds
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);

            if (leftChildPos) links.push({ source: pos, target: leftChildPos, label: `< ${Number(node.threshold).toFixed(2)}` });
            if (rightChildPos) links.push({ source: pos, target: rightChildPos, label: `≥ ${Number(node.threshold).toFixed(2)}` });

            return pos;
        };

        buildTree(root, 0);

        // Center the tree
        const treeWidth = maxX - minX;
        const offsetX = (width - treeWidth) / 2 - minX;
        const offsetY = 50; // Top padding

        // Apply offset
        const shiftedNodes = nodes.map(n => ({ ...n, x: n.x + offsetX, y: n.y + offsetY }));

        return {
            nodes: shiftedNodes,
            links: links.map(l => ({
                source: shiftedNodes.find(n => n.id === l.source.id)!,
                target: shiftedNodes.find(n => n.id === l.target.id)!,
                label: l.label
            })),
            bounds: { width: treeWidth, height: maxY + 100 }
        };
    }, [root, width]);

    // Fit to screen on load
    useEffect(() => {
        handleReset();
    }, [bounds]);

    // Handlers
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const scaleAmount = -e.deltaY * 0.001;
            const newScale = Math.min(Math.max(0.1, transform.k * (1 + scaleAmount)), 4);
            setTransform(prev => ({ ...prev, k: newScale }));
        } else {
            // Pan
            setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setTransform(prev => ({
            ...prev,
            x: e.clientX - startPan.x,
            y: e.clientY - startPan.y
        }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleZoomIn = () => setTransform(prev => ({ ...prev, k: Math.min(prev.k * 1.2, 4) }));
    const handleZoomOut = () => setTransform(prev => ({ ...prev, k: Math.max(prev.k / 1.2, 0.1) }));

    const handleReset = () => {
        // Calculate fit
        const scaleX = width / (bounds.width + 100);
        const scaleY = height / (bounds.height + 100);
        const k = Math.min(scaleX, scaleY, 1); // Don't zoom in if it fits, capping at 1
        const x = (width - bounds.width * k) / 2;
        const y = 50;
        setTransform({ x, y, k });
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative bg-slate-50 overflow-hidden cursor-move select-none"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-lg border border-slate-200 z-10">
                <button onClick={handleZoomIn} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Zoom In"><ZoomIn size={20} /></button>
                <button onClick={handleZoomOut} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Zoom Out"><ZoomOut size={20} /></button>
                <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Fit to Screen"><Maximize size={20} /></button>
            </div>

            <div className="absolute top-4 left-4 bg-white/80 p-2 rounded-lg text-xs text-slate-400 pointer-events-none">
                {Math.round(transform.k * 100)}%
            </div>

            <svg width="100%" height="100%" className="overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="24" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                    </marker>
                </defs>
                <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
                    {links.map((link, i) => (
                        <g key={i}>
                            <line
                                x1={link.source.x}
                                y1={link.source.y}
                                x2={link.target.x}
                                y2={link.target.y}
                                stroke="#cbd5e1"
                                strokeWidth="2"
                                markerEnd="url(#arrowhead)"
                            />
                            <rect
                                x={(link.source.x + link.target.x) / 2 - 20}
                                y={(link.source.y + link.target.y) / 2 - 10}
                                width="40"
                                height="16"
                                fill="white"
                                opacity="0.8"
                                rx="4"
                            />
                            <text
                                x={(link.source.x + link.target.x) / 2}
                                y={(link.source.y + link.target.y) / 2 + 3}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#64748b"
                                fontWeight="bold"
                            >
                                {link.label}
                            </text>
                        </g>
                    ))}
                    {nodes.map((n) => (
                        <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                            <circle
                                r="24"
                                fill={n.node.isLeaf ? "#ecfdf5" : "#eff6ff"}
                                stroke={n.node.isLeaf ? "#10b981" : "#3b82f6"}
                                strokeWidth="2"
                                className="shadow-sm transition-colors hover:stroke-[3px]"
                            />
                            <foreignObject x="-60" y="-12" width="120" height="40" style={{ pointerEvents: 'none' }}>
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <span className={`text-[10px] font-bold ${n.node.isLeaf ? "text-emerald-700" : "text-blue-700"} bg-white/90 px-2 py-0.5 rounded shadow-sm border border-slate-100 truncate max-w-full drop-shadow-sm`}>
                                        {n.node.isLeaf
                                            ? typeof n.node.value === 'number' ? Number(n.node.value).toFixed(2) : n.node.value
                                            : n.node.feature}
                                    </span>
                                </div>
                            </foreignObject>
                            <title>
                                {n.node.isLeaf
                                    ? `Leaf Node\nValue: ${n.node.value}\nSamples: ${n.node.samples}\nImpurity: ${n.node.impurity?.toFixed(3)}`
                                    : `Split Node\nFeature: ${n.node.feature}\nThreshold: ${n.node.threshold}\nSamples: ${n.node.samples}\nImpurity: ${n.node.impurity?.toFixed(3)}`}
                            </title>
                        </g>
                    ))}
                </g>
            </svg>
        </div>
    );
};

export default TreeVisualizer;
