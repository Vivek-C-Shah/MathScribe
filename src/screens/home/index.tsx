import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { SWATCHES } from '@/constants';

enum Tool {
    Draw = 'draw',
    Erase = 'erase',
    Text = 'text',
    Rectangle = 'rectangle',
    Square = 'square',
    Circle = 'circle',
    Triangle = 'triangle',
}

interface GeneratedResult {
    expr: string;
    result: string;
    assign?: boolean;
}

interface TextItem {
    id: number;
    position: { x: number; y: number };
    text: string;
    fontSize: number;
}

interface LatexExpression {
    id: number;
    text: string;
    position: { x: number; y: number };
}

declare global {
    interface Window {
        MathJax: {
            Hub: {
                Config: (config: object) => void;
                Queue: (command: Array<() => void>) => void;
            };
        };
    }
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null); // New ref for context
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [color, setColor] = useState<string>('rgb(0, 0, 0)');
    const [strokeWidth, setStrokeWidth] = useState<number>(3);
    const [currentTool, setCurrentTool] = useState<Tool>(Tool.Draw);
    const [undoStack, setUndoStack] = useState<string[]>([]);
    const [redoStack, setRedoStack] = useState<string[]>([]);
    const [reset, setReset] = useState<boolean>(false);
    const [dictOfVars, setDictOfVars] = useState<{ [key: string]: string }>({});
    const [result, setResult] = useState<GeneratedResult | undefined>(undefined);
    const [latexExpressions, setLatexExpressions] = useState<LatexExpression[]>([]);
    const [textItems, setTextItems] = useState<TextItem[]>([]);
    const [nextTextItemId, setNextTextItemId] = useState<number>(1);
    const [fontSize, setFontSize] = useState<number>(16);
    const [selectedTextItemId, setSelectedTextItemId] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
    const MAX_STACK_SIZE = 20;
    const latexContainerRef = useRef<HTMLDivElement>(null);
    const textContainerRef = useRef<HTMLDivElement>(null);

    /**
     * Function to render LaTeX expressions onto the designated container.
     * This utilizes MathJax for typesetting.
     *
     * @param expression - The LaTeX expression to render.
     * @param answer - The corresponding answer or result.
     */
    const renderLatexToCanvas = (expression: string, answer: string) => {
        if (latexContainerRef.current && window.MathJax) {
            latexContainerRef.current.innerHTML += `<div>${expression} = ${answer}</div>`;
            window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, latexContainerRef.current]);
        }
    };

    // Canvas Initialization and MathJax Script Loading
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctxRef.current = ctx; // Store context in ref
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round';
                ctx.strokeStyle = color; // Initial strokeStyle
                ctx.lineWidth = strokeWidth; // Initial lineWidth
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }

        const script = document.createElement('script');
        script.src =
            'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);
        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
            });
        };

        return () => {
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    ctxRef.current = null; // Clear context ref
                }
            }
            document.head.removeChild(script);
        };
    }, []); // Run only once on mount

    // Update strokeWidth and color without resetting the canvas
    useEffect(() => {
        if (ctxRef.current) {
            ctxRef.current.strokeStyle = color;
            ctxRef.current.lineWidth = strokeWidth;
        }
    }, [strokeWidth, color]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expr, result.result);
        }
    }, [result]);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setResult(undefined);
            setDictOfVars({});
            setUndoStack([]);
            setRedoStack([]);
            setTextItems([]);
            setReset(false);
            setLatexExpressions([]);
        }
    }, [reset]);

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas && ctxRef.current) {
            const ctx = ctxRef.current;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    };

    const saveState = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dataURL = canvas.toDataURL();
            setUndoStack((prev) => {
                const newStack = [...prev, dataURL];
                if (newStack.length > MAX_STACK_SIZE) {
                    newStack.shift();
                }
                return newStack;
            });
            setRedoStack([]);
        }
    };

    const undo = useCallback(() => {
        if (undoStack.length === 0) return;
        const canvas = canvasRef.current;
        if (canvas && ctxRef.current) {
            const ctx = ctxRef.current;
            const lastState = undoStack[undoStack.length - 1];
            setUndoStack((prev) => prev.slice(0, prev.length - 1));
            setRedoStack((prev) => [...prev, canvas.toDataURL()]);
            const img = new Image();
            img.src = lastState;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
        }
    }, [undoStack]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;
        const canvas = canvasRef.current;
        if (canvas && ctxRef.current) {
            const ctx = ctxRef.current;
            const lastState = redoStack[redoStack.length - 1];
            setRedoStack((prev) => prev.slice(0, prev.length - 1));
            setUndoStack((prev) => [...prev, canvas.toDataURL()]);
            const img = new Image();
            img.src = lastState;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
        }
    }, [redoStack]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (![Tool.Draw, Tool.Erase, Tool.Rectangle, Tool.Circle, Tool.Triangle, Tool.Square].includes(currentTool)) return;
        saveState();
        const { offsetX, offsetY } = e.nativeEvent;
        if (currentTool === Tool.Draw || currentTool === Tool.Erase) {
            if (ctxRef.current) {
                const ctx = ctxRef.current;
                ctx.beginPath();
                ctx.moveTo(offsetX, offsetY);
                setIsDrawing(true);
            }
        } else {
            setStartPoint({ x: offsetX, y: offsetY });
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isDrawing) {
            if (ctxRef.current) {
                const ctx = ctxRef.current;
                if (currentTool === Tool.Erase) {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.strokeStyle = 'rgba(0,0,0,1)';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.strokeStyle = color;
                }
                ctx.lineWidth = strokeWidth;
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        } else if (startPoint && [Tool.Rectangle, Tool.Circle, Tool.Triangle, Tool.Square].includes(currentTool)) {
            const canvas = canvasRef.current;
            if (canvas && ctxRef.current) {
                const ctx = ctxRef.current;
                resetCanvas();
                if (undoStack.length > 0) {
                    const img = new Image();
                    img.src = undoStack[undoStack.length - 1];
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        ctx.strokeStyle = color;
                        ctx.lineWidth = strokeWidth;
                        ctx.beginPath();
                        drawShape(ctx, currentTool, startPoint, { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
                        ctx.stroke();
                    };
                }
            }
        }
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isDrawing) {
            setIsDrawing(false);
            if (ctxRef.current) {
                const ctx = ctxRef.current;
                ctx.closePath();
                ctx.globalCompositeOperation = 'source-over';
            }
        } else if (startPoint && [Tool.Rectangle, Tool.Circle, Tool.Triangle, Tool.Square].includes(currentTool)) {
            saveState();
            const endPoint = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
            drawFinalShape(currentTool, startPoint, endPoint);
            setStartPoint(null);
        }
    };

    const drawShape = (
        ctx: CanvasRenderingContext2D,
        tool: Tool,
        start: { x: number; y: number },
        end: { x: number; y: number }
    ) => {
        const width = end.x - start.x;
        const height = end.y - start.y;
        switch (tool) {
            case Tool.Rectangle:
                ctx.rect(start.x, start.y, width, height);
                break;
            case Tool.Square: {
                const size = Math.min(Math.abs(width), Math.abs(height));
                ctx.rect(start.x, start.y, width < 0 ? -size : size, height < 0 ? -size : size);
                break;
            }
            case Tool.Circle: {
                const radius = Math.sqrt(width * width + height * height);
                ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
                break;
            }
            case Tool.Triangle:
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.lineTo(start.x * 2 - end.x, end.y);
                ctx.closePath();
                break;
            default:
                break;
        }
    };

    const drawFinalShape = (tool: Tool, start: { x: number; y: number }, end: { x: number; y: number }) => {
        if (ctxRef.current) {
            const ctx = ctxRef.current;
            ctx.strokeStyle = color;
            ctx.lineWidth = strokeWidth;
            ctx.beginPath();
            drawShape(ctx, tool, start, end);
            ctx.stroke();
            ctx.closePath();
        }
    };

    const getTouchPos = (touchEvent: React.TouchEvent<HTMLCanvasElement>): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const touch = touchEvent.touches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    };

    const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (![Tool.Draw, Tool.Erase, Tool.Rectangle, Tool.Circle, Tool.Triangle, Tool.Square].includes(currentTool)) return;
        saveState();
        const { x, y } = getTouchPos(e);
        if (currentTool === Tool.Draw || currentTool === Tool.Erase) {
            if (ctxRef.current) {
                const ctx = ctxRef.current;
                ctx.beginPath();
                ctx.moveTo(x, y);
                setIsDrawing(true);
            }
        } else {
            setStartPoint({ x, y });
        }
    };

    const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (isDrawing) {
            const { x, y } = getTouchPos(e);
            if (ctxRef.current) {
                const ctx = ctxRef.current;
                if (currentTool === Tool.Erase) {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.strokeStyle = 'rgba(0,0,0,1)';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.strokeStyle = color;
                }
                ctx.lineWidth = strokeWidth;
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        } else if (startPoint && [Tool.Rectangle, Tool.Circle, Tool.Triangle, Tool.Square].includes(currentTool)) {
            const { x, y } = getTouchPos(e);
            const canvas = canvasRef.current;
            if (canvas && ctxRef.current) {
                const ctx = ctxRef.current;
                resetCanvas();
                if (undoStack.length > 0) {
                    const img = new Image();
                    img.src = undoStack[undoStack.length - 1];
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        ctx.strokeStyle = color;
                        ctx.lineWidth = strokeWidth;
                        ctx.beginPath();
                        drawShape(ctx, currentTool, startPoint, { x, y });
                        ctx.stroke();
                    };
                }
            }
        }
    };

    const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (isDrawing) {
            setIsDrawing(false);
            if (ctxRef.current) {
                const ctx = ctxRef.current;
                ctx.closePath();
                ctx.globalCompositeOperation = 'source-over';
            }
        } else if (startPoint && [Tool.Rectangle, Tool.Circle, Tool.Triangle, Tool.Square].includes(currentTool)) {
            saveState();
            const { x, y } = getTouchPos(e);
            const endPoint = { x, y };
            drawFinalShape(currentTool, startPoint, endPoint);
            setStartPoint(null);
        }
    };

    const runRoute = async () => {
        const canvas = canvasRef.current;
        if (canvas) {
            try {
                const offscreenCanvas = document.createElement("canvas");
                offscreenCanvas.width = canvas.width;
                offscreenCanvas.height = canvas.height;
                const ctx = offscreenCanvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(canvas, 0, 0);
                    ctx.textBaseline = "top";
                    textItems.forEach((item) => {
                        ctx.font = `${item.fontSize}px sans-serif`;
                        ctx.fillStyle = "black";
                        ctx.fillText(item.text, item.position.x, item.position.y);
                    });
                    const imageDataURL = offscreenCanvas.toDataURL("image/png");
                    console.log("Image Data URL:", imageDataURL);
                    const response = await axios.post(
                        `${import.meta.env.VITE_API_URL}/magic`,
                        {
                            image: imageDataURL,
                            dict_of_vars: dictOfVars,
                        },
                    );
                    const resp = response.data;
                    console.log("API Response:", resp);
                    if (Array.isArray(resp.data)) {
                        resp.data.forEach((data: GeneratedResult) => {
                            setDictOfVars((prev) => ({
                                ...prev,
                                [data.expr]: data.result,
                            }));
                        });
                    } else {
                        console.error(
                            "API Error: Data is not an array",
                            resp.data,
                        );
                    }
                    const ctx2 = canvas.getContext("2d");
                    if (ctx2) {
                        const imageData = ctx2.getImageData(
                            0,
                            0,
                            canvas.width,
                            canvas.height,
                        );
                        let minX = canvas.width,
                            minY = canvas.height,
                            maxX = 0,
                            maxY = 0;
                        for (let y = 0; y < canvas.height; y++) {
                            for (let x = 0; x < canvas.width; x++) {
                                const i = (y * canvas.width + x) * 4;
                                if (imageData.data[i + 3] > 0) {
                                    minX = Math.min(minX, x);
                                    minY = Math.min(minY, y);
                                    maxX = Math.max(maxX, x);
                                    maxY = Math.max(maxY, y);
                                }
                            }
                        }
                        const centerX = (minX + maxX) / 2;
                        const centerY = (minY + maxY) / 2;
                        if (Array.isArray(resp.data)) {
                            resp.data.forEach((data: GeneratedResult, index: number) => {
                                const assign = data.assign ?? true;
                                if (assign) {
                                    const offset = index * 30;
                                    const newPosition = {
                                        x: centerX + offset,
                                        y: centerY + offset,
                                    };
                                    setLatexExpressions((prev) => [
                                        ...prev,
                                        {
                                            id: prev.length + 1,
                                            text: `\\(\\LARGE{\\text{${data.expr}} = \\text{${data.result}}}\\)`,
                                            position: newPosition,
                                        },
                                    ]);
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('API Error:', error);
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                undo();
            } else if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [undo, redo]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (currentTool === Tool.Text) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const newTextItem: TextItem = {
                    id: nextTextItemId,
                    position: { x, y },
                    text: 'Double-click to edit',
                    fontSize: fontSize,
                };
                setTextItems((prev) => [...prev, newTextItem]);
                setNextTextItemId((prev) => prev + 1);
            }
        }
    };

    const updateTextItemPosition = (id: number, x: number, y: number) => {
        setTextItems((prevItems) =>
            prevItems.map((prevItem) =>
                prevItem.id === id
                    ? { ...prevItem, position: { x, y } }
                    : prevItem,
            ),
        );
    };

    const updateTextItemContent = (id: number, text: string) => {
        setTextItems((prevItems) =>
            prevItems.map((prevItem) =>
                prevItem.id === id ? { ...prevItem, text } : prevItem,
            ),
        );
    };

    const TextItemComponent = React.memo(({ item }: { item: TextItem }) => {
        const contentRef = useRef<HTMLDivElement>(null);
        const handleInput = () => {
            // Handle input if needed
        };
        const handleBlur = () => {
            const newText = contentRef.current?.textContent || '';
            updateTextItemContent(item.id, newText);
            setSelectedTextItemId(null);
        };
        return (
            <Draggable
                position={item.position}
                onStop={(_e, data) => {
                    updateTextItemPosition(item.id, data.x, data.y);
                }}
                bounds="parent"
                handle={`#drag-handle-${item.id}`}
            >
                <div className="absolute z-20" style={{ cursor: 'move' }}>
                    <div
                        id={`drag-handle-${item.id}`}
                        style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: isDragging ? '#ffd6ff' : '#c8b6ff',
                            cursor: 'grab',
                            borderRadius: '4px',
                            marginBottom: '4px',
                        }}
                        onMouseDown={() => setIsDragging(true)}
                        onMouseUp={() => setIsDragging(false)}
                    >
                        &#9776;
                    </div>
                    <div
                        id={`text-item-${item.id}`}
                        className="text-content"
                        contentEditable
                        suppressContentEditableWarning
                        ref={contentRef}
                        style={{
                            fontSize: item.fontSize,
                            cursor: 'text',
                            userSelect: 'text',
                            color: 'black',
                            padding: '4px',
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            borderRadius: '4px',
                            minWidth: '100px',
                            minHeight: '30px',
                        }}
                        onInput={handleInput}
                        onFocus={() => setSelectedTextItemId(item.id)}
                        onBlur={handleBlur}
                    >
                        {item.text}
                    </div>
                </div>
            </Draggable>
        );
    });

    useEffect(() => {
        if (latexExpressions.length > 0 && window.MathJax && latexContainerRef.current) {
            window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, latexContainerRef.current]);
        }
    }, [latexExpressions]);

    return (
        <>
            <div className="grid grid-cols-6 gap-2 p-4 bg-gray-800">
                <Button
                    onClick={() => setReset(true)}
                    className="z-20 bg-red-600 text-white"
                    variant="filled"
                    color="red"
                >
                    Reset
                </Button>
                <Button
                    onClick={undo}
                    disabled={undoStack.length === 0}
                    className="z-20 bg-blue-600 text-white"
                    variant="filled"
                    color="blue"
                >
                    Undo
                </Button>
                <Button
                    onClick={redo}
                    disabled={redoStack.length === 0}
                    className="z-20 bg-blue-600 text-white"
                    variant="filled"
                    color="blue"
                >
                    Redo
                </Button>
                <Group className="z-20 col-span-2">
                    {SWATCHES.map((swatch) => (
                        <ColorSwatch
                            key={swatch}
                            color={swatch}
                            onClick={() => setColor(swatch)}
                            style={{ cursor: 'pointer' }}
                        />
                    ))}
                    <Button
                        onClick={() =>
                            setCurrentTool((prev) =>
                                prev === Tool.Erase ? Tool.Draw : Tool.Erase,
                            )
                        }
                        variant={currentTool === Tool.Erase ? "filled" : "outline"}
                        color={currentTool === Tool.Erase ? "red" : "gray"}
                        className="ml-2 flex items-center justify-center"
                    >
                        {currentTool === Tool.Erase ? "Eraser" : "Pencil"}
                    </Button>
                    <Button
                        onClick={() => setCurrentTool(Tool.Text)}
                        variant={currentTool === Tool.Text ? "filled" : "outline"}
                        color={currentTool === Tool.Text ? "blue" : "gray"}
                        className="ml-2 flex items-center justify-center"
                    >
                        Text
                    </Button>
                    <Button
                        onClick={() => setCurrentTool(Tool.Rectangle)}
                        variant={currentTool === Tool.Rectangle ? "filled" : "outline"}
                        color={currentTool === Tool.Rectangle ? "green" : "gray"}
                        className="ml-2 flex items-center justify-center"
                    >
                        Rectangle
                    </Button>
                    <Button
                        onClick={() => setCurrentTool(Tool.Circle)}
                        variant={currentTool === Tool.Circle ? "filled" : "outline"}
                        color={currentTool === Tool.Circle ? "green" : "gray"}
                        className="ml-2 flex items-center justify-center"
                    >
                        Circle
                    </Button>
                    <Button
                        onClick={() => setCurrentTool(Tool.Triangle)}
                        variant={currentTool === Tool.Triangle ? "filled" : "outline"}
                        color={currentTool === Tool.Triangle ? "green" : "gray"}
                        className="ml-2 flex items-center justify-center"
                    >
                        Triangle
                    </Button>
                </Group>
                <Button
                    onClick={runRoute}
                    className="z-20 bg-green-600 text-white"
                    variant="filled"
                    color="green"
                >
                    Run
                </Button>
                {currentTool === Tool.Text && (
                    <div className="flex items-center ml-4">
                        <label htmlFor="defaultFontSize" className="mr-2 text-white">
                            Font Size:
                        </label>
                        <input
                            id="defaultFontSize"
                            type="number"
                            min="8"
                            max="72"
                            value={fontSize}
                            onChange={(e) => {
                                const newFontSize = Number(e.target.value);
                                setFontSize(newFontSize);
                            }}
                            className="w-16 p-1 rounded"
                        />
                    </div>
                )}
                {selectedTextItemId !== null && (
                    <>
                        <div className="flex items-center ml-4">
                            <label htmlFor="fontSize" className="mr-2 text-white">
                                Font Size:
                            </label>
                            <input
                                id="fontSize"
                                type="number"
                                min="8"
                                max="72"
                                value={
                                    textItems.find((item) => item.id === selectedTextItemId)
                                        ?.fontSize || fontSize
                                }
                                onChange={(e) => {
                                    const newFontSize = Number(e.target.value);
                                    setTextItems((prevItems) =>
                                        prevItems.map((prevItem) =>
                                            prevItem.id === selectedTextItemId
                                                ? { ...prevItem, fontSize: newFontSize }
                                                : prevItem,
                                        ),
                                    );
                                }}
                                className="w-16 p-1 rounded"
                            />
                        </div>
                        <Button
                            onClick={() => {
                                setTextItems((prevItems) =>
                                    prevItems.filter(
                                        (item) => item.id !== selectedTextItemId,
                                    ),
                                );
                                setSelectedTextItemId(null);
                            }}
                            className="ml-2 bg-red-600 text-white"
                        >
                            Delete Text
                        </Button>
                    </>
                )}
            </div>
            <div className="flex items-center p-4 bg-gray-700">
                <label
                    htmlFor="strokeWidth"
                    className="mr-4 text-white font-medium"
                >
                    Stroke Width:
                </label>
                <input
                    id="strokeWidth"
                    type="range"
                    min="1"
                    max="20"
                    value={strokeWidth}
                    onChange={(e) => {
                        const newValue = Number(e.target.value);
                        console.log("Stroke Width Changed To:", newValue);
                        setStrokeWidth(newValue);
                    }}
                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none"
                />
                <span className="ml-4 text-white font-medium">{strokeWidth}</span>
            </div>
            <div className="relative w-full h-screen">
                <canvas
                    ref={canvasRef}
                    id="canvas"
                    className={`absolute top-0 left-0 w-full h-full z-10`}
                    style={{
                        cursor:
                            currentTool === Tool.Text
                                ? "text"
                                : currentTool === Tool.Erase
                                    ? `url('/eraser-cursor.png') 16 16, auto`
                                    : "crosshair",
                        touchAction: "none",
                    }}
                    draggable="false"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawingTouch}
                    onTouchMove={drawTouch}
                    onTouchEnd={stopDrawingTouch}
                    onTouchCancel={stopDrawingTouch}
                    onClick={handleCanvasClick}
                />
                <div ref={latexContainerRef}>
                    {latexExpressions.map((expr) => (
                        <Draggable
                            key={`latex-${expr.id}`}
                            position={expr.position}
                            onStop={(_e, data) => {
                                setLatexExpressions((prev) =>
                                    prev.map((item) =>
                                        item.id === expr.id
                                            ? { ...item, position: { x: data.x, y: data.y } }
                                            : item,
                                    ),
                                );
                            }}
                        >
                            <div className="absolute p-2 text-white bg-gray-900 bg-opacity-75 rounded shadow-md z-20">
                                <div className="latex-content">{expr.text}</div>
                            </div>
                        </Draggable>
                    ))}
                </div>
                <div ref={textContainerRef} className="relative w-full h-full">
                    {textItems.map((item) => (
                        <TextItemComponent key={`text-${item.id}`} item={item} />
                    ))}
                </div>
            </div>
        </>
    )
}
