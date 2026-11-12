//! 실행: `cargo run -p server --release` (rts-3d 디렉터리에서)
//! - PORT (기본 8080)
//! - STATIC_DIR (기본 dist) — `npm run build` 결과물을 함께 서빙

use std::path::PathBuf;

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8080);
    let static_dir = PathBuf::from(std::env::var("STATIC_DIR").unwrap_or_else(|_| "dist".into()));
    let serve_static = static_dir.join("index.html").exists().then_some(static_dir.clone());
    if serve_static.is_none() {
        eprintln!("참고: {}/index.html 없음 — WebSocket만 제공합니다 (npm run build 후 정적 파일도 서빙)", static_dir.display());
    }
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await.expect("포트 바인딩 실패");
    println!("Three Fronts 서버: http://localhost:{port}  (WebSocket /ws)");
    axum::serve(listener, server::app(serve_static)).await.expect("서버 오류");
}
