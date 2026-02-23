<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
$baseDir = realpath(__DIR__ . "/..");
$typeToFolder = [
    "fractals" => $baseDir . "/img/fractals",
    "digital" => $baseDir . "/img/digital",
    "fotos" => $baseDir . "/img/fotos",
    "raspi" => $baseDir . "/img/lab/raspi",
    "esp32" => $baseDir . "/img/lab/esp32",
    "code" => $baseDir . "/img/lab/code",
];
$typeAliases = [
    "fractals" => "fractals",
    "fraktale" => "fractals",
    "image" => "fractals",
    "digital" => "digital",
    "digitalart" => "digital",
    "pwn" => "digital",
    "fotos" => "fotos",
    "crow" => "fotos",
    "editor" => "code",
    "raspi" => "raspi",
    "esp32" => "esp32",
    "code" => "code",
];
$editablePages = [
    "raspi" => $baseDir . "/raspi.html",
    "esp32" => $baseDir . "/esp32.html",
    "code" => $baseDir . "/code.html",
];
const THUMB_MAX_EDGE = 640;

function sanitizeUploadBaseName(string $originalName): string
{
    $base = pathinfo($originalName, PATHINFO_FILENAME);
    $base = trim($base);
    if ($base === "") {
        return "upload";
    }

    $base = preg_replace("/[^\p{L}\p{N}\-\._ ]+/u", "", $base) ?? "";
    $base = preg_replace("/\s+/", " ", $base) ?? "";
    $base = trim($base, ". \t\n\r\0\x0B");

    if ($base === "") {
        return "upload";
    }

    if (strlen($base) > 180) {
        $base = substr($base, 0, 180);
        $base = rtrim($base, ". ");
    }

    return $base !== "" ? $base : "upload";
}

if (isset($_GET["page_content"])) {
    $pageKey = strtolower(trim((string)($_GET["page"] ?? "")));
    if (!isset($editablePages[$pageKey])) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "ungueltige seite"]);
        exit;
    }

    $pagePath = $editablePages[$pageKey];
    $rawHtml = @file_get_contents($pagePath);
    if ($rawHtml === false) {
        http_response_code(500);
        echo json_encode(["status" => "ERR", "msg" => "seite konnte nicht gelesen werden"]);
        exit;
    }

    if (!preg_match("/<!--\\s*EDITABLE:START\\s*-->(.*?)<!--\\s*EDITABLE:END\\s*-->/s", $rawHtml, $matches)) {
        http_response_code(500);
        echo json_encode(["status" => "ERR", "msg" => "editierbereich nicht gefunden"]);
        exit;
    }

    $content = trim((string)($matches[1] ?? ""));
    echo json_encode([
        "status" => "OK",
        "page" => $pageKey,
        "content" => $content
    ]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $action = strtolower(trim((string)($_POST["action"] ?? "")));
    if ($action === "save_page") {
        $pageKey = strtolower(trim((string)($_POST["page"] ?? "")));
        if (!isset($editablePages[$pageKey])) {
            http_response_code(400);
            echo json_encode(["status" => "ERR", "msg" => "ungueltige seite"]);
            exit;
        }

        $content = (string)($_POST["content"] ?? "");
        if (strlen($content) > 200000) {
            http_response_code(413);
            echo json_encode(["status" => "ERR", "msg" => "inhalt zu gross"]);
            exit;
        }

        $pagePath = $editablePages[$pageKey];
        $rawHtml = @file_get_contents($pagePath);
        if ($rawHtml === false) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "seite konnte nicht gelesen werden"]);
            exit;
        }

        $updatedHtml = preg_replace_callback(
            "/(<!--\\s*EDITABLE:START\\s*-->)(.*?)(<!--\\s*EDITABLE:END\\s*-->)/s",
            function ($matches) use ($content) {
                return $matches[1] . "\n" . $content . "\n" . $matches[3];
            },
            $rawHtml,
            1
        );

        if ($updatedHtml === null || $updatedHtml === $rawHtml) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "seite konnte nicht aktualisiert werden"]);
            exit;
        }

        if (@file_put_contents($pagePath, $updatedHtml) === false) {
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "seite konnte nicht gespeichert werden"]);
            exit;
        }

        echo json_encode([
            "status" => "OK",
            "page" => $pageKey
        ]);
        exit;
    }

    $imgtypRaw = strtolower(trim((string)($_POST["imgtyp"] ?? "fractals")));
    $imgtyp = $typeAliases[$imgtypRaw] ?? $imgtypRaw;
    if (!isset($typeToFolder[$imgtyp])) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "ungueltiger imgtyp"]);
        exit;
    }

    $file = $_FILES["image"] ?? ($_FILES["file"] ?? null);
    if (empty($file)) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "keine datei im feld image/file"]);
        exit;
    }

    $uploadError = (int)($file["error"] ?? UPLOAD_ERR_NO_FILE);
    if ($uploadError !== UPLOAD_ERR_OK) {
        $uploadErrorMsg = "upload fehlgeschlagen";
        if ($uploadError === UPLOAD_ERR_INI_SIZE || $uploadError === UPLOAD_ERR_FORM_SIZE) {
            $uploadErrorMsg = "datei zu gross (php upload limit)";
        } elseif ($uploadError === UPLOAD_ERR_PARTIAL) {
            $uploadErrorMsg = "datei wurde nur teilweise hochgeladen";
        } elseif ($uploadError === UPLOAD_ERR_NO_FILE) {
            $uploadErrorMsg = "keine datei hochgeladen";
        } elseif ($uploadError === UPLOAD_ERR_NO_TMP_DIR) {
            $uploadErrorMsg = "php temp-verzeichnis fehlt";
        } elseif ($uploadError === UPLOAD_ERR_CANT_WRITE) {
            $uploadErrorMsg = "datei konnte nicht auf disk geschrieben werden";
        } elseif ($uploadError === UPLOAD_ERR_EXTENSION) {
            $uploadErrorMsg = "php extension hat upload gestoppt";
        }
        http_response_code(400);
        echo json_encode([
            "status" => "ERR",
            "msg" => $uploadErrorMsg,
            "upload_error" => $uploadError
        ]);
        exit;
    }

    if (($file["size"] ?? 0) <= 0 || $file["size"] > MAX_UPLOAD_BYTES) {
        http_response_code(413);
        echo json_encode(["status" => "ERR", "msg" => "datei zu gross oder leer"]);
        exit;
    }

    $tmp = $file["tmp_name"];
    if (!is_uploaded_file($tmp)) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "ungueltige upload-temp-datei"]);
        exit;
    }
    $mime = mime_content_type($tmp);
    $allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!in_array($mime, $allowedMimes, true)) {
        http_response_code(415);
        echo json_encode(["status" => "ERR", "msg" => "format nicht erlaubt"]);
        exit;
    }

    $targetDir = $typeToFolder[$imgtyp];
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0755, true);
    }

    $source = @imagecreatefromstring(file_get_contents($tmp));
    if (!$source) {
        http_response_code(400);
        echo json_encode(["status" => "ERR", "msg" => "bild ungueltig"]);
        exit;
    }

    $originalName = (string)($file["name"] ?? "upload.jpg");
    $baseName = sanitizeUploadBaseName($originalName);
    $filename = $baseName . ".jpg";
    $counter = 2;
    while (file_exists(rtrim($targetDir, "/") . "/" . $filename)) {
        $filename = $baseName . "-" . $counter . ".jpg";
        $counter++;
    }

    $target = rtrim($targetDir, "/") . "/" . $filename;
    if (!imagejpeg($source, $target, 90)) {
        imagedestroy($source);
        http_response_code(500);
        echo json_encode(["status" => "ERR", "msg" => "speichern fehlgeschlagen"]);
        exit;
    }

    if (in_array($imgtyp, ["fractals", "digital", "fotos"], true)) {
        $thumbDir = rtrim($targetDir, "/") . "/tn";
        if (!is_dir($thumbDir) && !mkdir($thumbDir, 0755, true)) {
            @unlink($target);
            imagedestroy($source);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "thumbnail-verzeichnis fehlt"]);
            exit;
        }

        $srcWidth = imagesx($source);
        $srcHeight = imagesy($source);
        if ($srcWidth <= 0 || $srcHeight <= 0) {
            @unlink($target);
            imagedestroy($source);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "ungueltige bildgroesse"]);
            exit;
        }

        $thumbScale = min(THUMB_MAX_EDGE / $srcWidth, THUMB_MAX_EDGE / $srcHeight, 1);
        $thumbWidth = max(1, (int)round($srcWidth * $thumbScale));
        $thumbHeight = max(1, (int)round($srcHeight * $thumbScale));
        $thumb = imagecreatetruecolor($thumbWidth, $thumbHeight);
        if (!$thumb) {
            @unlink($target);
            imagedestroy($source);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "thumbnail-erstellung fehlgeschlagen"]);
            exit;
        }

        if (!imagecopyresampled($thumb, $source, 0, 0, 0, 0, $thumbWidth, $thumbHeight, $srcWidth, $srcHeight)) {
            imagedestroy($thumb);
            @unlink($target);
            imagedestroy($source);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "thumbnail-resize fehlgeschlagen"]);
            exit;
        }

        $thumbTarget = $thumbDir . "/" . $filename;
        if (!imagejpeg($thumb, $thumbTarget, 85)) {
            imagedestroy($thumb);
            @unlink($target);
            imagedestroy($source);
            http_response_code(500);
            echo json_encode(["status" => "ERR", "msg" => "thumbnail-speichern fehlgeschlagen"]);
            exit;
        }
        imagedestroy($thumb);
    }
    imagedestroy($source);

    $publicPath = str_replace($baseDir, "", $target);
    if (strpos($publicPath, "/") !== 0) {
        $publicPath = "/" . ltrim($publicPath, "/");
    }
    echo json_encode([
        "status" => "OK",
        "img" => $publicPath,
        "typ" => $imgtyp
    ]);
    exit;
}

$path = $baseDir . "/img/fractals";
if (isset($_GET["digital"])) {
    $path = $baseDir . "/img/digital";
} elseif (isset($_GET["fotos"])) {
    $path = $baseDir . "/img/fotos";
}

if (isset($_GET["latest"])) {
    $dirArray = [];
    $myDirectory = @opendir($path);
    if ($myDirectory !== false) {
        while (($entryName = readdir($myDirectory)) !== false) {
            if ($entryName === "." || $entryName === "..") {
                continue;
            }
            $fullPath = $path . "/" . $entryName;
            if (!is_file($fullPath)) {
                continue;
            }
            if (!preg_match("/\.(jpg|jpeg|png|gif|webp)$/i", $entryName)) {
                continue;
            }
            $dirArray[] = [
                "name" => $entryName,
                "mtime" => @filemtime($fullPath) ?: 0
            ];
        }
        closedir($myDirectory);
    }

    usort($dirArray, function ($a, $b) {
        return $b["mtime"] <=> $a["mtime"];
    });

    $sortedNames = array_map(function ($entry) {
        return $entry["name"];
    }, $dirArray);

    echo json_encode($sortedNames);
    exit;
}

// Legacy-Listing wie vorher (alphabetisch, inkl. Verzeichnis-Eintraege)
$dirArray = [];
$myDirectory = @opendir($path);
if ($myDirectory !== false) {
    while (($entryName = readdir($myDirectory)) !== false) {
        $dirArray[] = $entryName;
    }
    closedir($myDirectory);
}
rsort($dirArray);
echo json_encode($dirArray);
