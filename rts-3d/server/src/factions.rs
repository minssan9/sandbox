//! 종족 데이터 — 클라이언트와 같은 `shared/factions.json`을 컴파일 시점에 포함한다.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;

use combat_core::world::{Attack, DamageType, Size, Trait};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FactionId {
    Coalition,
    Swarm,
    Ascendant,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UnitType {
    Worker,
    Infantry,
    Ranged,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BuildingType {
    Hq,
    Supply,
    Gas,
    Factory,
}

#[derive(Clone, Copy, Debug, Deserialize)]
pub struct Cost {
    pub ore: f64,
    pub gas: f64,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SizeName {
    Small,
    Medium,
    Large,
}

impl SizeName {
    pub fn to_size(self) -> Size {
        match self {
            SizeName::Small => Size::Small,
            SizeName::Medium => Size::Medium,
            SizeName::Large => Size::Large,
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DamageName {
    Kinetic,
    Explosive,
    Plasma,
}

#[derive(Clone, Copy, Debug, Deserialize)]
pub struct AttackDef {
    pub damage: f64,
    #[serde(rename = "type")]
    pub kind: DamageName,
    pub cooldown: f64,
    pub range: f64,
}

impl AttackDef {
    pub fn to_attack(self) -> Attack {
        Attack {
            damage: self.damage,
            kind: match self.kind {
                DamageName::Kinetic => DamageType::Kinetic,
                DamageName::Explosive => DamageType::Explosive,
                DamageName::Plasma => DamageType::Plasma,
            },
            cooldown: self.cooldown,
            range: self.range,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnitDef {
    pub name: String,
    pub hp: f64,
    pub shield: f64,
    pub armor: f64,
    pub size: SizeName,
    pub speed: f64,
    pub supply: f64,
    pub cost: Cost,
    pub build_time: f64,
    pub attack: Option<AttackDef>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildingDef {
    pub name: String,
    pub hp: f64,
    pub shield: Option<f64>,
    pub armor: f64,
    pub cost: Cost,
    pub build_time: f64,
    pub supply: Option<f64>,
    #[serde(default)]
    pub produces: Vec<UnitType>,
}

#[derive(Clone, Copy, Debug, Deserialize)]
pub struct Income {
    pub ore: f64,
    pub gas: f64,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TraitName {
    Repair,
    Regen,
    Shield,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Faction {
    pub name: String,
    #[serde(rename = "trait")]
    pub trait_: TraitName,
    pub worker_income: Income,
    pub buildings: HashMap<BuildingType, BuildingDef>,
    pub units: HashMap<UnitType, UnitDef>,
}

impl Faction {
    pub fn combat_trait(&self) -> Trait {
        match self.trait_ {
            TraitName::Repair => Trait::Repair,
            TraitName::Regen => Trait::Regen,
            TraitName::Shield => Trait::Shield,
        }
    }
    pub fn unit(&self, t: UnitType) -> &UnitDef {
        &self.units[&t]
    }
    pub fn building(&self, t: BuildingType) -> &BuildingDef {
        &self.buildings[&t]
    }
}

static FACTIONS: OnceLock<HashMap<FactionId, Faction>> = OnceLock::new();

pub fn faction(id: FactionId) -> &'static Faction {
    &FACTIONS.get_or_init(|| {
        serde_json::from_str(include_str!("../../shared/factions.json")).expect("shared/factions.json 파싱 실패")
    })[&id]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loads_shared_json() {
        let f = faction(FactionId::Swarm);
        assert_eq!(f.unit(UnitType::Infantry).name, "Skitter");
        assert_eq!(f.unit(UnitType::Infantry).supply, 0.5);
        assert_eq!(f.building(BuildingType::Factory).produces, vec![UnitType::Infantry, UnitType::Ranged]);
        assert!(faction(FactionId::Ascendant).building(BuildingType::Hq).shield.is_some());
        assert!(faction(FactionId::Coalition).unit(UnitType::Worker).attack.is_none());
    }
}
