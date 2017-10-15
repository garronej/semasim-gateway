-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u2
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Oct 14, 2017 at 12:59 AM
-- Server version: 5.5.55-0+deb8u1-log
-- PHP Version: 5.6.30-0+deb8u1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `semasim`
--

-- --------------------------------------------------------

--
-- Table structure for table `dongle`
--

CREATE TABLE IF NOT EXISTS `dongle` (
  `imei` varchar(15) NOT NULL,
  `last_connection_date` bigint(20) NOT NULL,
  `is_voice_enabled` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `endpoint`
--

CREATE TABLE IF NOT EXISTS `endpoint` (
`id_` int(11) NOT NULL,
  `dongle_imei` varchar(15) NOT NULL,
  `sim_iccid` varchar(22) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `message_toward_gsm`
--

CREATE TABLE IF NOT EXISTS `message_toward_gsm` (
`id_` int(11) NOT NULL,
  `date` bigint(20) NOT NULL,
  `ua_endpoint` int(11) NOT NULL,
  `to_number` varchar(25) NOT NULL,
  `base64_text` text NOT NULL,
  `send_date` bigint(20) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `message_toward_gsm_status_report`
--

CREATE TABLE IF NOT EXISTS `message_toward_gsm_status_report` (
  `message_toward_gsm` int(11) NOT NULL,
  `is_delivered` tinyint(1) NOT NULL,
  `discharge_date` bigint(20) DEFAULT NULL,
  `status` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `message_toward_sip`
--

CREATE TABLE IF NOT EXISTS `message_toward_sip` (
`id_` int(11) NOT NULL,
  `is_report` tinyint(1) NOT NULL,
  `date` bigint(20) NOT NULL,
  `from_number` varchar(25) NOT NULL,
  `base64_text` text NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `sim`
--

CREATE TABLE IF NOT EXISTS `sim` (
  `iccid` varchar(22) NOT NULL,
  `imsi` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ua`
--

CREATE TABLE IF NOT EXISTS `ua` (
  `instance` varchar(125) NOT NULL,
  `push_token` varchar(1024) DEFAULT NULL,
  `software` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ua_endpoint`
--

CREATE TABLE IF NOT EXISTS `ua_endpoint` (
`id_` int(11) NOT NULL,
  `ua_instance` varchar(125) NOT NULL,
  `endpoint` int(11) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `ua_endpoint_message_toward_sip`
--

CREATE TABLE IF NOT EXISTS `ua_endpoint_message_toward_sip` (
`id_` int(11) NOT NULL,
  `ua_endpoint` int(11) NOT NULL,
  `message_toward_sip` int(11) NOT NULL,
  `delivered_date` bigint(20) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `dongle`
--
ALTER TABLE `dongle`
 ADD PRIMARY KEY (`imei`);

--
-- Indexes for table `endpoint`
--
ALTER TABLE `endpoint`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `dongle_imei_2` (`dongle_imei`,`sim_iccid`), ADD KEY `dongle_imei` (`dongle_imei`), ADD KEY `sim_iccid` (`sim_iccid`);

--
-- Indexes for table `message_toward_gsm`
--
ALTER TABLE `message_toward_gsm`
 ADD PRIMARY KEY (`id_`), ADD KEY `ua_endpoint` (`ua_endpoint`);

--
-- Indexes for table `message_toward_gsm_status_report`
--
ALTER TABLE `message_toward_gsm_status_report`
 ADD PRIMARY KEY (`message_toward_gsm`);

--
-- Indexes for table `message_toward_sip`
--
ALTER TABLE `message_toward_sip`
 ADD PRIMARY KEY (`id_`);

--
-- Indexes for table `sim`
--
ALTER TABLE `sim`
 ADD PRIMARY KEY (`iccid`), ADD UNIQUE KEY `imei` (`imsi`);

--
-- Indexes for table `ua`
--
ALTER TABLE `ua`
 ADD PRIMARY KEY (`instance`);

--
-- Indexes for table `ua_endpoint`
--
ALTER TABLE `ua_endpoint`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `ua_instance_2` (`ua_instance`,`endpoint`), ADD KEY `ua_instance` (`ua_instance`), ADD KEY `endpoint` (`endpoint`);

--
-- Indexes for table `ua_endpoint_message_toward_sip`
--
ALTER TABLE `ua_endpoint_message_toward_sip`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `ua_endpoint_2` (`ua_endpoint`,`message_toward_sip`), ADD KEY `message_toward_sip` (`message_toward_sip`), ADD KEY `ua_endpoint` (`ua_endpoint`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `endpoint`
--
ALTER TABLE `endpoint`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=47;
--
-- AUTO_INCREMENT for table `message_toward_gsm`
--
ALTER TABLE `message_toward_gsm`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=16;
--
-- AUTO_INCREMENT for table `message_toward_sip`
--
ALTER TABLE `message_toward_sip`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=10;
--
-- AUTO_INCREMENT for table `ua_endpoint`
--
ALTER TABLE `ua_endpoint`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=32;
--
-- AUTO_INCREMENT for table `ua_endpoint_message_toward_sip`
--
ALTER TABLE `ua_endpoint_message_toward_sip`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=13;
--
-- Constraints for dumped tables
--

--
-- Constraints for table `endpoint`
--
ALTER TABLE `endpoint`
ADD CONSTRAINT `endpoint_ibfk_1` FOREIGN KEY (`sim_iccid`) REFERENCES `sim` (`iccid`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `endpoint_ibfk_2` FOREIGN KEY (`dongle_imei`) REFERENCES `dongle` (`imei`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `message_toward_gsm`
--
ALTER TABLE `message_toward_gsm`
ADD CONSTRAINT `message_toward_gsm_ibfk_1` FOREIGN KEY (`ua_endpoint`) REFERENCES `ua_endpoint` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `message_toward_gsm_status_report`
--
ALTER TABLE `message_toward_gsm_status_report`
ADD CONSTRAINT `message_toward_gsm_status_report_ibfk_1` FOREIGN KEY (`message_toward_gsm`) REFERENCES `message_toward_gsm` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ua_endpoint`
--
ALTER TABLE `ua_endpoint`
ADD CONSTRAINT `ua_endpoint_ibfk_1` FOREIGN KEY (`ua_instance`) REFERENCES `ua` (`instance`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `ua_endpoint_ibfk_2` FOREIGN KEY (`endpoint`) REFERENCES `endpoint` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ua_endpoint_message_toward_sip`
--
ALTER TABLE `ua_endpoint_message_toward_sip`
ADD CONSTRAINT `ua_endpoint_message_toward_sip_ibfk_3` FOREIGN KEY (`ua_endpoint`) REFERENCES `ua_endpoint` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `ua_endpoint_message_toward_sip_ibfk_2` FOREIGN KEY (`message_toward_sip`) REFERENCES `message_toward_sip` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

