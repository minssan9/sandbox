//! 클라이언트 ↔ 서버 WebSocket 메시지 (JSON, `t` 필드로 종류 구분).
//! 클라이언트 쪽 타입은 `src/net/protocol.ts`와 일치해야 한다.

use serde::{Deserialize, Serialize};

use crate::economy::Economy;
use crate::factions::{BuildingType, FactionId, UnitType};

#[derive(Clone, Debug, Deserialize, PartialEq)]
#[serde(tag = "t", rename_all = "camelCase")]
pub enum ClientMsg {
    /// 방 만들기 → `Room { team: 0 }`
    Create { faction: FactionId },
    /// 방 코드로 참가 → `Room { team: 1 }` 후 양쪽에 `Start`
    Join { code: String, faction: FactionId },
    Build { building: BuildingType },
    #[serde(rename_all = "camelCase")]
    Train { building_id: u32, unit: UnitType },
    Worker { to: WorkerTo },
    OrderTeam { mode: TeamMode },
    #[serde(rename_all = "camelCase")]
    Order { ids: Vec<u32>, mode: OrderMode, x: Option<f64>, z: Option<f64>, target_id: Option<u32> },
    /// 1인칭 빙의 대상 (None이면 해제)
    Possess { id: Option<u32> },
    /// 빙의 유닛 입력 (월드 기준 이동 방향, 사격 중 여부, 조준 대상)
    Input { dx: f64, dz: f64, firing: bool, aim: Option<u32> },
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum WorkerTo {
    Ore,
    Gas,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TeamMode {
    Attack,
    Hold,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OrderMode {
    Hold,
    Attack,
    Move,
    Target,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum EventOut {
    Shot { from: u32, to: u32, ranged: bool },
    Death { id: u32, team: u8, kind: EntityKind, supply: f64 },
}

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum EntityKind {
    Unit,
    Structure,
}

/// 엔티티 공개 상태 (짧은 키로 대역폭 절약). 정적 스탯은 클라이언트가 종족 데이터로 복원한다.
#[derive(Clone, Debug, Serialize)]
pub struct EntityView {
    pub id: u32,
    pub team: u8,
    pub f: FactionId,
    pub k: EntityKind,
    /// 유닛 타입 또는 건물 타입
    pub ty: String,
    pub x: f64,
    pub z: f64,
    pub hp: f64,
    pub sh: f64,
    pub cd: f64,
    /// 이동/공격/방어 명령 (0 hold / 1 attack / 2 move)
    pub m: u8,
    /// 1인칭 빙의 중
    pub p: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "t", rename_all = "camelCase")]
pub enum ServerMsg {
    Room { code: String, team: u8 },
    Start { team: u8, factions: [FactionId; 2] },
    #[serde(rename_all = "camelCase")]
    State {
        time: f64,
        elapsed: f64,
        last_combat_at: f64,
        last_combat_x: f64,
        last_combat_z: f64,
        /// 자기 경제만 (상대 경제는 비공개)
        eco: Economy,
        entities: Vec<EntityView>,
        events: Vec<EventOut>,
        possessed: Option<u32>,
    },
    /// 명령 거부 사유 (자원 부족 등)
    Rejected { reason: String },
    Over { winner: u8 },
    OpponentLeft,
    Error { reason: String },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_client_messages() {
        let m: ClientMsg = serde_json::from_str(r#"{"t":"train","buildingId":3,"unit":"ranged"}"#).unwrap();
        assert_eq!(m, ClientMsg::Train { building_id: 3, unit: UnitType::Ranged });
        let m: ClientMsg =
            serde_json::from_str(r#"{"t":"order","ids":[1,2],"mode":"target","targetId":9}"#).unwrap();
        assert!(matches!(m, ClientMsg::Order { mode: OrderMode::Target, target_id: Some(9), x: None, .. }));
        let m: ClientMsg = serde_json::from_str(r#"{"t":"possess","id":null}"#).unwrap();
        assert_eq!(m, ClientMsg::Possess { id: None });
    }

    #[test]
    fn serializes_events_like_ts() {
        let s = serde_json::to_string(&EventOut::Death { id: 4, team: 1, kind: EntityKind::Unit, supply: 0.5 }).unwrap();
        assert_eq!(s, r#"{"type":"death","id":4,"team":1,"kind":"unit","supply":0.5}"#);
        let s = serde_json::to_string(&ServerMsg::Room { code: "ABCD".into(), team: 0 }).unwrap();
        assert_eq!(s, r#"{"t":"room","code":"ABCD","team":0}"#);
    }
}
