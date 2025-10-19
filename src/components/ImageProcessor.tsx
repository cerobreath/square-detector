import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, Wand2, Scan } from "lucide-react";

/**
 * Генерує тестове зображення з випадковими геометричними фігурами
 * @param shapeCount - кількість фігур для генерації
 * @returns base64 згенерованого зображення
 */
const generateTestImage = (shapeCount: number): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const shapes = ["square", "circle", "triangle", "rectangle"];

    for (let i = 0; i < shapeCount; i++) {
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const x = Math.random() * (canvas.width - 120) + 60;
        const y = Math.random() * (canvas.height - 120) + 60;
        const size = Math.random() * 50 + 30;

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;

        if (shape === "square") {
            ctx.save();
            ctx.translate(x, y);

            // 50% квадратів будуть повернуті під випадковим кутом від -60° до +60°
            if (Math.random() > 0.5) {
                const angle = (Math.random() * 120 - 60) * Math.PI / 180;
                ctx.rotate(angle);
            }
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.restore();
        } else if (shape === "circle") {
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (shape === "triangle") {
            ctx.beginPath();
            ctx.moveTo(x, y - size / 2);
            ctx.lineTo(x - size / 2, y + size / 2);
            ctx.lineTo(x + size / 2, y + size / 2);
            ctx.closePath();
            ctx.fill();
        } else if (shape === "rectangle") {
            const width = size * 1.6;
            const height = size * 0.65;
            ctx.fillRect(x - width / 2, y - height / 2, width, height);
        }
    }

    return canvas.toDataURL();
};

export const ImageProcessor = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);

    // Дозволяємо пусте значення для можливості повного видалення
    const [shapeCount, setShapeCount] = useState<number | "">(5);

    const generateTestImageHandler = () => {
        const count = typeof shapeCount === "number" ? shapeCount : 5;
        const dataUrl = generateTestImage(count);
        setOriginalImage(dataUrl);
        setProcessedImage(null);
        toast.success("Тестове зображення згенеровано");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isSupported = (file.type && /image\/(png|jpeg|jpg|bmp)/.test(file.type)) || /\.bmp$/i.test(file.name);
        if (!isSupported) {
            toast.error("Будь ласка, завантажте PNG, JPG або BMP файл");
            return;
        }

        if (/\.bmp$/i.test(file.name) || /image\/bmp/.test(file.type)) {
            const url = URL.createObjectURL(file);
            setOriginalImage(url);
            setProcessedImage(null);
            toast.success("BMP зображення завантажено");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setOriginalImage(event.target?.result as string);
            setProcessedImage(null);
            toast.success("Зображення завантажено");
        };
        reader.readAsDataURL(file);
    };

    /**
     * Основна функція обробки зображення
     * Виконує: бінаризацію → пошук контурів → розпізнавання квадратів → маркування
     */
    const processImage = () => {
        if (!originalImage) {
            toast.error("Спочатку завантажте або згенеруйте зображення");
            return;
        }

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Перетворення в відтінки сірого
            const grayData = toGrayscale(imageData);

            // Бінаризація з автоматичною інверсією
            const binaryData = toBinary(grayData, 128, canvas.width, canvas.height);

            // Відображення бінарного зображення
            const out = ctx.createImageData(canvas.width, canvas.height);
            for (let i = 0; i < binaryData.length; i++) {
                const v = binaryData[i];
                const o = i * 4;
                out.data[o] = v;
                out.data[o + 1] = v;
                out.data[o + 2] = v;
                out.data[o + 3] = 255;
            }
            ctx.putImageData(out, 0, 0);

            // Пошук контурів об'єктів
            const contours = findContours(binaryData, canvas.width, canvas.height);

            let squaresFound = 0;
            contours.forEach(contour => {
                // Обчислення характеристик кожного об'єкта
                const features = calculateFeatures(contour, canvas.width, canvas.height, binaryData);

                // Перевірка чи є об'єкт квадратом
                const isSquare = isSquareShape(features);

                if (isSquare) {
                    squaresFound++;
                    const center = getCenter(contour, canvas.width);

                    // Динамічний розмір цифри залежно від розміру квадрата
                    const objectSize = Math.sqrt(features.area);
                    const fontSize = objectSize * 0.6;
                    const clampedFontSize = Math.max(20, Math.min(fontSize, 150));

                    ctx.fillStyle = "red";
                    ctx.font = `bold ${clampedFontSize}px Arial`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("4", center.x, center.y);
                }
            });

            setProcessedImage(canvas.toDataURL());
            toast.success(`Обробка завершена. Знайдено квадратів: ${squaresFound}`);
        };
        img.src = originalImage;
    };

    /**
     * Перетворює кольорове зображення у відтінки сірого
     * Використовує просте усереднення R, G, B компонентів
     */
    const toGrayscale = (imageData: ImageData): Uint8ClampedArray => {
        const gray = new Uint8ClampedArray(imageData.width * imageData.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
            gray[i / 4] = avg;
        }
        return gray;
    };

    // const toBinary = (grayData: Uint8ClampedArray, threshold: number, width: number, height: number): Uint8ClampedArray => {
    //     const binary = new Uint8ClampedArray(grayData.length);
    //     for (let i = 0; i < grayData.length; i++) {
    //         binary[i] = grayData[i] > threshold ? 255 : 0;
    //     }
    //
    //     // Підрахунок білих та чорних пікселів на краях зображення
    //     let edgeWhite = 0;
    //     let edgeBlack = 0;
    //
    //     // Верхній та нижній краї
    //     for (let x = 0; x < width; x++) {
    //         const topIdx = x;
    //         const bottomIdx = (height - 1) * width + x;
    //         if (binary[topIdx] === 255) edgeWhite++; else edgeBlack++;
    //         if (binary[bottomIdx] === 255) edgeWhite++; else edgeBlack++;
    //     }
    //
    //     // Лівий та правий краї
    //     for (let y = 0; y < height; y++) {
    //         const leftIdx = y * width;
    //         const rightIdx = y * width + (width - 1);
    //         if (binary[leftIdx] === 255) edgeWhite++; else edgeBlack++;
    //         if (binary[rightIdx] === 255) edgeWhite++; else edgeBlack++;
    //     }
    //
    //     // Якщо фон білий - інвертуємо зображення
    //     if (edgeWhite > edgeBlack) {
    //         for (let i = 0; i < binary.length; i++) {
    //             binary[i] = binary[i] === 255 ? 0 : 255;
    //         }
    //     }
    //
    //     return binary;
    // };

    /**
     * Бінаризація зображення з автоматичною інверсією
     * Перевіряє краї зображення: якщо більше білих пікселів - інвертує
     */
    const toBinary = (grayData: Uint8ClampedArray, threshold: number, width: number, height: number): Uint8ClampedArray => {
        const binary = new Uint8ClampedArray(grayData.length);
        for (let i = 0; i < grayData.length; i++) {
            binary[i] = grayData[i] > threshold ? 255 : 0;
        }

        // Підрахунок білих та чорних пікселів на краях зображення
        let edgeWhite = 0;
        let edgeBlack = 0;

        // Верхній та нижній краї
        for (let x = 0; x < width; x++) {
            const topIdx = x;
            const bottomIdx = (height - 1) * width + x;
            if (binary[topIdx] === 255) edgeWhite++; else edgeBlack++;
            if (binary[bottomIdx] === 255) edgeWhite++; else edgeBlack++;
        }

        // Лівий та правий краї
        for (let y = 0; y < height; y++) {
            const leftIdx = y * width;
            const rightIdx = y * width + (width - 1);
            if (binary[leftIdx] === 255) edgeWhite++; else edgeBlack++;
            if (binary[rightIdx] === 255) edgeWhite++; else edgeBlack++;
        }

        // Якщо фон білий - інвертуємо зображення
        if (edgeWhite > edgeBlack) {
            for (let i = 0; i < binary.length; i++) {
                binary[i] = binary[i] === 255 ? 0 : 255;
            }
        }

        // Заповнення пустот (fill holes)
        fillHoles(binary, width, height);

        return binary;
    };

    /**
     * Заповнює внутрішні пустоти в об'єктах (fill holes)
     * Алгоритм: знаходимо всі чорні області, що з'єднані з краями зображення (фон),
     * всі інші чорні області - це "дірки" всередині об'єктів, їх заповнюємо білим
     */
    const fillHoles = (binary: Uint8ClampedArray, width: number, height: number): void => {
        const visited = new Uint8Array(binary.length);

        // Маркуємо всі чорні пікселі на краях як фон
        const backgroundStack: number[] = [];

        // Верхній та нижній краї
        for (let x = 0; x < width; x++) {
            const topIdx = x;
            const bottomIdx = (height - 1) * width + x;
            if (binary[topIdx] === 0 && !visited[topIdx]) {
                backgroundStack.push(topIdx);
            }
            if (binary[bottomIdx] === 0 && !visited[bottomIdx]) {
                backgroundStack.push(bottomIdx);
            }
        }

        // Лівий та правий краї
        for (let y = 0; y < height; y++) {
            const leftIdx = y * width;
            const rightIdx = y * width + (width - 1);
            if (binary[leftIdx] === 0 && !visited[leftIdx]) {
                backgroundStack.push(leftIdx);
            }
            if (binary[rightIdx] === 0 && !visited[rightIdx]) {
                backgroundStack.push(rightIdx);
            }
        }

        // Flood fill від країв - маркуємо весь зовнішній фон
        while (backgroundStack.length > 0) {
            const idx = backgroundStack.pop()!;
            if (visited[idx] || binary[idx] !== 0) continue;

            visited[idx] = 1;

            const x = idx % width;
            const y = Math.floor(idx / width);

            // 4-сусідство
            const neighbors = [
                [0, -1], [1, 0], [0, 1], [-1, 0]
            ];

            for (const [dx, dy] of neighbors) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = ny * width + nx;
                    if (!visited[nIdx] && binary[nIdx] === 0) {
                        backgroundStack.push(nIdx);
                    }
                }
            }
        }

        //  Всі чорні пікселі, які НЕ відмічені як фон - це дірки, заповнюємо їх
        for (let i = 0; i < binary.length; i++) {
            if (binary[i] === 0 && !visited[i]) {
                binary[i] = 255; // Заповнюємо дірку білим
            }
        }
    };

    /**
     * Знаходить всі окремі об'єкти (контури) на бінарному зображенні
     * Використовує алгоритм flood fill для групування пікселів
     */
    const findContours = (binaryData: Uint8ClampedArray, width: number, height: number): number[][] => {
        const visited = new Uint8Array(binaryData.length);
        const contours: number[][] = [];

        for (let i = 0; i < binaryData.length; i++) {
            if (binaryData[i] === 255 && !visited[i]) {
                const contour = floodFill(binaryData, visited, i, width, height);

                // Ігноруємо дуже малі об'єкти (шум)
                if (contour.length > 50) {
                    contours.push(contour);
                }
            }
        }

        return contours;
    };

    /**
     * Алгоритм заповнення (flood fill) для виділення зв'язаних пікселів
     */
    const floodFill = (
        binaryData: Uint8ClampedArray,
        visited: Uint8Array,
        start: number,
        width: number,
        height: number
    ): number[] => {
        const stack = [start];
        const contour: number[] = [];

        while (stack.length > 0) {
            const idx = stack.pop()!;
            if (visited[idx] || binaryData[idx] !== 255) continue;

            visited[idx] = 1;
            contour.push(idx);

            const x = idx % width;
            const y = Math.floor(idx / width);

            // 8-сусідство
            const neighbors = [
                [-1, -1], [0, -1], [1, -1],
                [-1, 0], [1, 0],
                [-1, 1], [0, 1], [1, 1]
            ];

            for (const [dx, dy] of neighbors) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    stack.push(ny * width + nx);
                }
            }
        }

        return contour;
    };

    /**
     * Обчислює геометричні характеристики об'єкта для класифікації
     */
    const calculateFeatures = (contour: number[], width: number, height: number, binaryData: Uint8ClampedArray) => {
        const area = contour.length;

        // Знаходимо мінімальний прямокутник, що описує об'єкт
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        contour.forEach(idx => {
            const x = idx % width;
            const y = Math.floor(idx / width);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        });

        const boxWidth = maxX - minX + 1;
        const boxHeight = maxY - minY + 1;

        // Aspect ratio: співвідношення сторін bounding box
        // Для квадрата близьке до 1, для прямокутника > 1
        const aspectRatio = boxWidth / boxHeight;

        // Підрахунок периметра (довжина границі об'єкта)
        let perimeter = 0;
        const pixelSet = new Set(contour);

        contour.forEach(idx => {
            const x = idx % width;
            const y = Math.floor(idx / width);

            const neighbors = [
                [0, -1], [1, 0], [0, 1], [-1, 0]
            ];

            // Якщо піксель має хоча б одного сусіда поза об'єктом - він на границі
            for (const [dx, dy] of neighbors) {
                const nx = x + dx;
                const ny = y + dy;
                const nIdx = ny * width + nx;
                if (!pixelSet.has(nIdx)) {
                    perimeter++;
                    break;
                }
            }
        });

        // Компактність: наскільки форма близька до кола
        // Для кола = 1, для квадрата ≈ 0.785, для витягнутих фігур < 0.5
        // Формула: (4 × π × площа) / (периметр²)
        const compactness = (4 * Math.PI * area) / (perimeter * perimeter);

        let sumX = 0, sumY = 0;
        let sumX2 = 0, sumY2 = 0, sumXY = 0;

        contour.forEach(idx => {
            const x = idx % width;
            const y = Math.floor(idx / width);
            sumX += x;
            sumY += y;
            sumX2 += x * x;
            sumY2 += y * y;
            sumXY += x * y;
        });

        // Центр мас об'єкта
        const centerX = sumX / area;
        const centerY = sumY / area;

        // Центральні моменти другого порядку
        // mu20: "розтягнутість" по горизонталі
        // mu02: "розтягнутість" по вертикалі
        // mu11: "скошеність" (якщо фігура повернута)
        const mu20 = sumX2 / area - centerX * centerX;
        const mu02 = sumY2 / area - centerY * centerY;
        const mu11 = sumXY / area - centerX * centerY;

        // Власні значення матриці інерції
        // Вони показують головні осі об'єкта (як довгі та короткі осі еліпса)
        const lambda1 = (mu20 + mu02 + Math.sqrt((mu20 - mu02) ** 2 + 4 * mu11 ** 2)) / 2;
        const lambda2 = (mu20 + mu02 - Math.sqrt((mu20 - mu02) ** 2 + 4 * mu11 ** 2)) / 2;

        // Еліптичність (eccentricity): наскільки форма витягнута
        // 0 = ідеальне коло/квадрат (симетрична фігура)
        // близько до 1 = дуже витягнутий еліпс/прямокутник
        const eccentricity = lambda1 > 0 ? Math.sqrt(1 - lambda2 / lambda1) : 1;

        return { area, perimeter, compactness, aspectRatio, boxWidth, boxHeight, eccentricity };
    };

    /**
     * Визначає чи є об'єкт квадратом
     * Працює для прямих і повернутих квадратів (до 60°)
     */
    const isSquareShape = (features: ReturnType<typeof calculateFeatures>): boolean => {
        const { compactness, aspectRatio, area, boxWidth, boxHeight, eccentricity } = features;
        const boxArea = boxWidth * boxHeight;

        // Fill ratio: яку частину bounding box займає об'єкт
        // Для прямого квадрата ≈ 1, для повернутого на 45° ≈ 0.5
        const fillRatio = area / boxArea;

        // Компактність повинна бути високою, але менше ніж у кола
        const isCompact = compactness > 0.55 && compactness < 0.92;

        // Bounding box майже квадратний, об'єкт заповнює його повністю
        const isStraightSquare =
            aspectRatio > 0.85 && aspectRatio < 1.15 &&  // Майже квадратний box
            fillRatio > 0.85 &&                          // Заповнює 85%+ box
            isCompact;

        // Використовуємо еліптичність - ключовий параметр для повернутих фігур
        // Квадрат залишається симетричним навіть при обертанні
        const isRotatedSquare =
            eccentricity < 0.4 &&      // Низька витягнутість (симетрична форма)
            fillRatio > 0.45 &&        // Заповнює 35-95% box
            fillRatio < 0.85 &&
            isCompact &&
            aspectRatio > 0.6 && aspectRatio < 1.7;  // Ширші межі для великих кутів

        return isStraightSquare || isRotatedSquare;
    };

    /**
     * Обчислює центр мас об'єкта для розміщення маркера
     */
    const getCenter = (contour: number[], width: number): { x: number; y: number } => {
        let sumX = 0;
        let sumY = 0;

        contour.forEach(idx => {
            sumX += idx % width;
            sumY += Math.floor(idx / width);
        });

        return {
            x: sumX / contour.length,
            y: sumY / contour.length
        };
    };

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="shapeCount">Кількість фігур для генерації</Label>
                        <Input
                            id="shapeCount"
                            type="number"
                            min="1"
                            max="100"
                            value={shapeCount}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                    setShapeCount("");
                                } else {
                                    const num = parseInt(val);
                                    if (!isNaN(num)) {
                                        setShapeCount(Math.max(1, Math.min(num, 100)));
                                    }
                                }
                            }}
                            placeholder="1-100"
                            className="mt-2"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button onClick={generateTestImageHandler} className="flex-1 min-w-[200px]">
                            <Wand2 className="mr-2 h-4 w-4" />
                            Згенерувати тестове зображення
                        </Button>

                        <div className="flex-1 min-w-[200px]">
                            <Label htmlFor="fileUpload" className="w-full">
                                <Button variant="secondary" className="w-full" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Завантажити зображення
                  </span>
                                </Button>
                                <Input
                                    id="fileUpload"
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/bmp,.bmp"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </Label>
                        </div>

                        <Button
                            onClick={processImage}
                            disabled={!originalImage}
                            className="flex-1 min-w-[200px]"
                            variant="default"
                        >
                            <Scan className="mr-2 h-4 w-4" />
                            Обробити зображення
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Оригінальне зображення</h3>
                    <div className="bg-muted rounded-lg aspect-square flex items-center justify-center overflow-hidden">
                        {originalImage ? (
                            <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
                        ) : (
                            <p className="text-muted-foreground">Завантажте або згенеруйте зображення</p>
                        )}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Оброблене зображення</h3>
                    <div className="bg-muted rounded-lg aspect-square flex items-center justify-center overflow-hidden">
                        {processedImage ? (
                            <img src={processedImage} alt="Processed" className="max-w-full max-h-full object-contain" />
                        ) : (
                            <p className="text-muted-foreground">Результат з'явиться тут після обробки</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};