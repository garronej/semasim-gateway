-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u2
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Mer 28 Mars 2018 à 09:39
-- Version du serveur :  5.5.55-0+deb8u1-log
-- Version de PHP :  5.6.30-0+deb8u1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Base de données :  `semasim`
--

-- --------------------------------------------------------

--
-- Structure de la table `message_toward_gsm`
--

CREATE TABLE IF NOT EXISTS `message_toward_gsm` (
`id_` int(11) NOT NULL,
  `date` bigint(20) NOT NULL,
  `ua_sim` int(11) NOT NULL,
  `to_number` varchar(25) NOT NULL,
  `text` text NOT NULL,
  `send_date` bigint(20) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `message_toward_sip`
--

CREATE TABLE IF NOT EXISTS `message_toward_sip` (
`id_` int(11) NOT NULL,
  `is_from_dongle` tinyint(1) NOT NULL,
  `bundled_data` text NOT NULL,
  `date` bigint(20) NOT NULL,
  `from_number` varchar(25) NOT NULL,
  `text` text NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=120 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `ua`
--

CREATE TABLE IF NOT EXISTS `ua` (
`id_` int(11) NOT NULL,
  `instance` varchar(125) NOT NULL,
  `user_email` varchar(150) NOT NULL,
  `platform` varchar(15) NOT NULL,
  `push_token` varchar(1024) NOT NULL,
  `software` varchar(255) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=347 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `ua_sim`
--

CREATE TABLE IF NOT EXISTS `ua_sim` (
`id_` int(11) NOT NULL,
  `ua` int(11) NOT NULL,
  `imsi` varchar(15) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=347 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `ua_sim_message_toward_sip`
--

CREATE TABLE IF NOT EXISTS `ua_sim_message_toward_sip` (
`id_` int(11) NOT NULL,
  `ua_sim` int(11) NOT NULL,
  `message_toward_sip` int(11) NOT NULL,
  `delivered_date` bigint(20) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=192 DEFAULT CHARSET=utf8;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `message_toward_gsm`
--
ALTER TABLE `message_toward_gsm`
 ADD PRIMARY KEY (`id_`), ADD KEY `ua_sim` (`ua_sim`);

--
-- Index pour la table `message_toward_sip`
--
ALTER TABLE `message_toward_sip`
 ADD PRIMARY KEY (`id_`);

--
-- Index pour la table `ua`
--
ALTER TABLE `ua`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `instance` (`instance`,`user_email`);

--
-- Index pour la table `ua_sim`
--
ALTER TABLE `ua_sim`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `ua_2` (`ua`,`imsi`), ADD KEY `ua` (`ua`);

--
-- Index pour la table `ua_sim_message_toward_sip`
--
ALTER TABLE `ua_sim_message_toward_sip`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `ua_sim_2` (`ua_sim`,`message_toward_sip`), ADD KEY `ua_sim` (`ua_sim`), ADD KEY `message_toward_sip` (`message_toward_sip`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `message_toward_gsm`
--
ALTER TABLE `message_toward_gsm`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=24;
--
-- AUTO_INCREMENT pour la table `message_toward_sip`
--
ALTER TABLE `message_toward_sip`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=120;
--
-- AUTO_INCREMENT pour la table `ua`
--
ALTER TABLE `ua`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=347;
--
-- AUTO_INCREMENT pour la table `ua_sim`
--
ALTER TABLE `ua_sim`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=347;
--
-- AUTO_INCREMENT pour la table `ua_sim_message_toward_sip`
--
ALTER TABLE `ua_sim_message_toward_sip`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=192;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `message_toward_gsm`
--
ALTER TABLE `message_toward_gsm`
ADD CONSTRAINT `message_toward_gsm_ibfk_1` FOREIGN KEY (`ua_sim`) REFERENCES `ua_sim` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `ua_sim`
--
ALTER TABLE `ua_sim`
ADD CONSTRAINT `ua_sim_ibfk_1` FOREIGN KEY (`ua`) REFERENCES `ua` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `ua_sim_message_toward_sip`
--
ALTER TABLE `ua_sim_message_toward_sip`
ADD CONSTRAINT `ua_sim_message_toward_sip_ibfk_1` FOREIGN KEY (`ua_sim`) REFERENCES `ua_sim` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `ua_sim_message_toward_sip_ibfk_2` FOREIGN KEY (`message_toward_sip`) REFERENCES `message_toward_sip` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

