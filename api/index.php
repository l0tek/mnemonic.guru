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
$typeToFolder = [
    "fractals" => "../img/fractals",
    "digital" => "../img/digital",
    "fotos" => "../img/fotos",
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
];

if ($_SERVER["REQUEST_METHOD"] === "POST") {
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

    $filename = bin2hex(random_bytes(16)) . ".jpg";
    $target = rtrim($targetDir, "/") . "/" . $filename;
    if (!imagejpeg($source, $target, 90)) {
        imagedestroy($source);
        http_response_code(500);
        echo json_encode(["status" => "ERR", "msg" => "speichern fehlgeschlagen"]);
        exit;
    }
    imagedestroy($source);

    // API liefert weiterhin relative img-Pfade
    $publicPath = str_replace("../", "./", $target);
    echo json_encode([
        "status" => "OK",
        "img" => $publicPath,
        "typ" => $imgtyp
    ]);
    exit;
}

$path = "../img/fractals";
if (isset($_GET["digital"])) {
    $path = "../img/digital";
} elseif (isset($_GET["fotos"])) {
    $path = "../img/fotos";
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
